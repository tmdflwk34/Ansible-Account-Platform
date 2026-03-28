FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y awscli ansible jq bash sudo && \
    pip install boto3

WORKDIR /home/app/ansible

COPY . /home/app/ansible/

ENTRYPOINT ["./docker/entrypoint.sh"]
