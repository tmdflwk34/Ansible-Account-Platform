#!/bin/bash

aws ssm delete-document --name "ChangeRoleAutomation" --region us-east-1 2>/dev/null

aws ssm create-document \
  --name "ChangeRoleAutomation" \
  --document-type Automation \
  --region us-east-1 \
  --content file:///home/app/ansible/ssm_automation/documents/change_role.yml \
  --document-format YAML

echo "ChangeRoleAutomation 문서 업로드 완료"

