#!/bin/bash
set -e

# Install dependencies
npm ci

# Build the project
npm run build
