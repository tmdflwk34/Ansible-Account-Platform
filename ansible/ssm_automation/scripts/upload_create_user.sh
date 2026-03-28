#!/bin/bash

aws ssm delete-document --name "CreateUserAutomation" --region us-east-1 2>/dev/null

aws ssm create-document \
  --name "CreateUserAutomation" \
  --document-type Automation \
  --region us-east-1 \
  --content file:///home/app/ansible/ssm_automation/documents/create_user.yml \
  --document-format YAML

echo "CreateUserAutomation 문서 업로드 완료"

