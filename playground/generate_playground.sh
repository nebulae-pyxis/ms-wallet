#!/bin/bash

# FrontEnd - EMI composition
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/nebulae-pyxis/emi --frontend-id=emi --output-dir=/home/nesas-12/Documents/projects/PYXIS/ms-wallet/playground/emi  --setup-file=/home/nesas-12/Documents/projects/PYXIS/ms-wallet/etc/mfe-setup.json

# API - GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-pyxis/emi-gateway --api-id=emi-gateway --output-dir=/home/nesas-12/Documents/projects/PYXIS/ms-wallet/playground/emi-gateway  --setup-file=/home/nesas-12/Documents/projects/PYXIS/ms-wallet/etc/mapi-setup.json
