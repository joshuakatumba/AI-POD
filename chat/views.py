import dataclasses
import json
from asgiref.sync import sync_to_async
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from django.http import StreamingHttpResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chat.models import Session, SessionMessage
from chat.serializers import CreateSessionSerializer, SessionDetailSerializer, SessionMessageCreateSerializer, SessionResponseSerializer
from orchestrator.core import ReportAgentRunner, EngineeringDeps
from orchestrator.utils import seed_session_ai
from sysadmin.models import AIWorkflow
from sysadmin.serializers import AIWorkflowDetailSerializer


class SessionsApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CreateSessionSerializer
        return SessionResponseSerializer
    
    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        membership_id = auth.get("membership_id")
        project_id = self.kwargs.get("project_id")
        user = self.request.user

        # Base filtering: organisation, project, ownership, and soft-delete
        queryset = Session.objects.filter(
            organisation_id=organisation_id,
            is_deleted=False, # Standard practice in this style
        ).order_by("-created_at")

        project_id = self.kwargs.get("project_id") or self.request.query_params.get("project_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        if membership_id:
            queryset = queryset.filter(membership_id=membership_id)

        # --- Manual Filter: created_at logic ---
        # Note: Mimicking your previous filterset_fields behavior
        created_at_gte = self.request.query_params.get("created_at__gte")
        created_at_lte = self.request.query_params.get("created_at__lte")
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if created_at_gte:
            queryset = queryset.filter(created_at__gte=created_at_gte)
        if created_at_lte:
            queryset = queryset.filter(created_at__lte=created_at_lte)

        return queryset
    
    @swagger_auto_schema(
        operation_description="List sessions for a specific project with date filters.",
        manual_parameters=[
            openapi.Parameter("project_id", openapi.IN_QUERY, description="Filter sessions from this project", type=openapi.TYPE_STRING),
            openapi.Parameter("created_at__gte", openapi.IN_QUERY, description="Filter sessions from this date (ISO 8601)", type=openapi.TYPE_STRING),
            openapi.Parameter("created_at__lte", openapi.IN_QUERY, description="Filter sessions up to this date (ISO 8601)", type=openapi.TYPE_STRING),
        ],
        responses={
            200: SessionResponseSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
            404: openapi.Response(description="Project not found"),
        },
        tags=["Chat - Sessions"],
    )
    def get(self, request):
        """List all sessions in a project"""
        queryset = self.get_queryset()
        
        # Applying pagination manually to match the structure if desired, 
        # but the target style skips explicit pagination in the GET method.
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(
        operation_description=(
            "Start An AI Agent Session"
        ),
        request_body=CreateSessionSerializer,
        responses={
            201: openapi.Response(description="Session started successfully"),
            400: "Validation error",
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Chat - Sessions"],
    )
    def post(self, request):
        serializer = CreateSessionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            session = serializer.save()

            # Seed the Ai Session
            seed_session_ai(session)

            # return response
            response_serializer = SessionResponseSerializer(session)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SessionDetailSerializer

    def get_object(self, session_id):
        # DRF get_object is sync, which is fine for the GET method
        return get_object_or_404(Session, id=session_id)

    @swagger_auto_schema(
        operation_description="Retrieve a single session",
        responses={200: SessionDetailSerializer()},
        tags=["Chat - Session"],
    )
    def get(self, request, session_id):
        model = self.get_object(session_id)
        serializer = self.get_serializer(model)
        return Response(serializer.data)
    

class StreamApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SessionMessageCreateSerializer

    def get_object(self, session_id):    
        return get_object_or_404(
            Session.objects.select_related(
                "membership",
                "organisation",
                "project",
                "created_by",
            ),
            id=session_id
        )

    @swagger_auto_schema(
        operation_description="Stream a session",
        responses={200: SessionResponseSerializer()},
        tags=["Chat - Stream"],
    )
    def post(self, request, session_id):
        """
        Handles the AI interaction via a streaming response.
        """
        # 1. Validate Input
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_text = serializer.validated_data.get("content")

        # 2. Fetch Session & Context (Async)
        try:
            session = model = self.get_object(session_id)
        except Session.DoesNotExist:
            return Response({"error": "Session not found"}, status=404)
        
        # 3. Fetch Full Message History
        # We fetch ALL messages for this session to give the AI full context
        db_messages = SessionMessage.objects.filter(session=session).order_by('created_at')
        history = [
            msg.to_pydantic_ai_format() 
            for msg in db_messages 
            if msg.to_pydantic_ai_format() is not None
        ]

        # 4. Persistence: Save User Message
        SessionMessage.objects.create(
            session=session,
            organisation=session.organisation,
            membership=session.membership,
            created_by=session.created_by,
            role='user',
            content=user_text
        )

        # 4. Prepare Dependencies
        deps = EngineeringDeps(session=session, user=request.user)

        inspector_agent = ReportAgentRunner(workflow=session.workflow)

        # 5. Streaming Generator
        async def event_generator():
            full_content = ""
            
            # Use the agent's run_stream directly
            # Note: If your Runner wraps this, call inspector_agent.agent.run_stream
            import json

            async with inspector_agent.agent.run_stream(user_text, deps=deps, message_history=history) as result:

                async for chunk in result.stream_text(debounce_by=None):
                    yield json.dumps({
                        "type": "token",
                        "data": chunk
                    }) + "\n"

                full_content = await result.get_output()

                yield json.dumps({
                    "type": "final",
                    "data": full_content
                }) + "\n"

                usage_data = result.usage()
                usage_dict = dataclasses.asdict(usage_data)

                await sync_to_async(SessionMessage.objects.create)(
                    session=session,
                    organisation=session.organisation,
                    membership=session.membership,
                    content=full_content,
                    role='assistant',
                    metadata={
                        "status_at_time": session.status,
                        'usage': usage_dict
                    },
                    created_by=session.created_by,
                )
        return StreamingHttpResponse(
            event_generator(), 
            content_type='text/plain' # Change to 'text/event-stream' if using SSE headers
        )
   
        
class ChatAIWorkflowsApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AIWorkflow.objects.select_related("ai_model").filter(is_deleted=False).order_by("-created_at")

    @swagger_auto_schema(
        operation_description="List all available AI workflows for chat sessions.",
        responses={
            200: AIWorkflowDetailSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Chat - AI Workflows"],
    )
    def get(self, request):
        serializer = AIWorkflowDetailSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)


class ChatAIWorkflowApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Retrieve a single AI workflow by ID.",
        manual_parameters=[
            openapi.Parameter(
                "workflow_id",
                openapi.IN_PATH,
                description="AI workflow ID",
                type=openapi.TYPE_STRING,
            )
        ],
        responses={
            200: AIWorkflowDetailSerializer(),
            401: openapi.Response(description="Authentication required"),
            404: openapi.Response(description="AI workflow not found"),
        },
        tags=["Chat - AI Workflows"],
    )
    def get(self, request, workflow_id):
        workflow = get_object_or_404(AIWorkflow, id=workflow_id, is_deleted=False)
        serializer = AIWorkflowDetailSerializer(workflow)
        return Response(serializer.data)