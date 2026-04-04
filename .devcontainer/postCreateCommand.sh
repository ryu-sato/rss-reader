#!/bin/bash

sudo apt -y update
sudo apt -y install sqlite3

pip install -r scripts/scoring/requirements.txt

# Claude Code's sandbox dependencies
#   ripgrep (rg): found                                                                                                                                                                                                                                                                                                  
#   bubblewrap (bwrap): not installed                                                                                                                                                                                                                                                                                    
sudo apt -y install bubblewrap
#   socat: not installed
sudo apt -y install socat
#   seccomp filter: not installed (required to block unix domain sockets)
sudo npm install -g @anthropic-ai/sandbox-runtime
#     · or copy vendor/seccomp/* from sandbox-runtime and set
#       sandbox.seccomp.bpfPath and applyPath in settings.json
