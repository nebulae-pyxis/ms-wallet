#!/bin/bash

# FrontEnd - EMI composition
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/git_project/frontendid --frontend-id=frontendid --output-dir=working_directory/ms-msname/playground/frontendid  --setup-file=working_directory/ms-msname/etc/mfe-setup.json

# API - GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/git_project/apiid --api-id=apiid --output-dir=working_directory/ms-msname/playground/apiid  --setup-file=working_directory/ms-msname/etc/mapi-setup.json
