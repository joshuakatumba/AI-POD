import os

import boto3


def get_ses_client():
    region = os.getenv("AWS_REGION")
    if os.getenv("ENV") == "local":
        return boto3.client(
            "ses",
            region_name=region,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
    return boto3.client("ses", region_name=region)