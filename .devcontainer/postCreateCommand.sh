#!/bin/bash

sudo apt -y update
sudo apt -y install sqlite3

pip install -r scripts/scoring/requirements.txt
