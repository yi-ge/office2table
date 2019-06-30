#!/bin/bash
rsync -avr --delete-after --exclude ".git" build/* root@yige.ink:/root/site/office2table
