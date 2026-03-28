#!/bin/bash

aws ssm delete-document --name "RemoveUserAutomation" --region us-east-1 2>/dev/null

aws ssm create-document \
  --name "RemoveUserAutomation" \
  --document-type Automation \
  --region us-east-1 \
  --content file:///home/app/ansible/ssm_automation/documents/remove_user.yml \
  --document-format YAML

echo "RemoveUserAutomation 문서 업로드 완료"

