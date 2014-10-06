#!/bin/sh
# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Various commands to run for building and deploying

if [ "$#" -lt 1 ]; then
  echo "Usage: run.sh <command>"
  echo "Commands -"
  echo "  pull <source> pulls the base docker image from the specified registry."
  echo
  echo "  build  builds the docker image."
  echo "  start  starts a docker instance."
  echo "  shell  starts a docker instance to provide a shell prompt in the container."
  echo
  echo "  deploy <project> deploys to a managed VM in the cloud."
  echo "  devapp <project> deploys to the local dev app server."
  echo
  exit
fi

if [ "$1" = "pull" ]; then
  if [ "$#" -lt 2 ]; then
    echo "Missing registry argument."
    exit
  fi

  sudo docker pull $2/gcp-ipython
  exit
fi

if [ "$1" = "build" ]; then
  sudo docker build -t gcp-ipython-instance .
  exit
fi

if [ "$1" = "start" ]; then
  sudo docker run -p 127.0.0.1:8080:8080 -t gcp-ipython-instance -name ipy
  exit
fi

if [ "$1" = "shell" ]; then
  sudo docker run -i --entrypoint="/bin/bash" \
     -v ~/.config:/.config:rw \
     -t gcp-ipython-instance
  exit
fi

if [ "$1" = "deploy" ]; then
  if [ "$#" -lt 2 ]; then
    echo "Missing project name argument."
    exit
  fi

  sudo gcloud preview app deploy . --force \
    --project $2 \
    --version preview1 \
    --server preview.appengine.google.com \
    --docker-host unix:///var/run/docker.sock
  exit
fi

if [ "$1" = "devapp" ]; then
  if [ "$#" -lt 2 ]; then
    echo "Missing project name argument."
    exit
  fi

  sudo gcloud preview app run . \
    --project $2 \
    --docker-host unix:///var/run/docker.sock
  exit
fi

echo "Unknown command."

