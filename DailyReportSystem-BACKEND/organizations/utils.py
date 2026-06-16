# organizations/utils.py
from django.shortcuts import get_object_or_404
from organizations.models import Membership, Organization


def get_membership(organization_id, membership_id):
    """
    Helper function to get membership with proper filtering.
    
    Args:
        organization_id: UUID of the organization
        membership_id: UUID of the membership
    
    Returns:
        tuple: (organization, membership)
    
    Raises:
        404: If organization or membership not found or membership is inactive
    """
    organization = get_object_or_404(Organization, id=organization_id)
    membership = get_object_or_404(
        Membership,
        id=membership_id,
        organization=organization,
        is_active=True  # Only get active memberships
    )
    return organization, membership
