#!/bin/bash
USERNAME=$1
ACTION=$2

if [ "$ACTION" = "grant" ]; then
  echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
fi

if [ "$ACTION" = "revoke" ]; then
  sed -i "/$USERNAME ALL=/d" /etc/sudoers
fi
