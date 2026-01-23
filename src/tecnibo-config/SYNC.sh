#!/bin/bash
# ==========================================================
# Tecnibo Articles API Cheat Sheet
# Endpoints served by: /src/app/api/articlesFs/...
# ==========================================================

# ----------------------------------------------------------
# 1) Get all articles
#    Lists every article currently stored on the server.
# ----------------------------------------------------------
curl -s -X GET http://192.168.30.92:3009/api/articlesFs | jq .




# ----------------------------------------------------------
# 2) Get article data by CPID (Custom Property ID)
#    Requires route: /api/articlesFs/by-CPID/[cpid]
#    Example: fetch article with CPID = ERA
#    ⚠️ Ensure you have implemented this route
# ----------------------------------------------------------
curl -s "http://192.168.30.92:3009/api/articlesFs/by-CPID/ERA" | jq .


# ----------------------------------------------------------
# 3) Update data sources
#    Updates shared combo-box sources (like Colors).
#    Requires route: /api/articlesFs/data-sources
#    ⚠️ Ensure this route exists in your code
# ----------------------------------------------------------


curl -X PUT \
  -H "Content-Type: application/json" \
  -d '{"Colors":[{"label":"Red","value":"red"}]}' \
  http://192.168.30.92:3009/api/articlesFs/data-sources | jq .


# ----------------------------------------------------------
# 4) Add new article to the catalog
#    Creates a new empty article with a given name.
# ----------------------------------------------------------


curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"T100"}' \
  http://192.168.30.92:3009/api/articlesFs | jq .


# ----------------------------------------------------------
# 5) Create a new article
#    Same as #4, example with different name.
# ----------------------------------------------------------
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"My Article 2"}' \
  http://192.168.30.92:3009/api/articlesFs | jq .


# ----------------------------------------------------------
# 6) Clone an article
#    Duplicates an article by its ID into a new one.
#    Replace {id} with a real article ID.
# ----------------------------------------------------------


curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Clone of My Article"}' \
  http://192.168.30.92:3009/api/articlesFs/article-1758041490191-e7b5c3a1/clone | jq .


# ----------------------------------------------------------
# 7) Delete an article
#    Deletes an article by ID.
#    Replace {id} with the target article ID.
# ----------------------------------------------------------

curl -X DELETE \
  http://192.168.30.92:3009/api/articlesFs/article-1758041490191-e7b5c3a1 | jq .


# ----------------------------------------------------------
# 8) Get latest catalog of an article
#    Retrieves the most recent catalog data for a given article ID.
# ----------------------------------------------------------
curl -s \
  http://192.168.30.92:3009/api/articlesFs/article-1758102266438-4cc617f2/catalog | jq .

