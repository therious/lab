# syntax = docker/dockerfile:1
# this is for static files and just assembles prebuilt content from monorepo
# https://www.docker.com/blog/how-to-use-the-official-nginx-docker-image/
#==========
#latest nginx is 1.27  1.19 is smaller?
FROM nginx:1.19
#FROM seanpublic/nginx:tiny
#FROM ricardbejarano/nginx:1.19.0

# try not using this with the seanpublic/nginx:tiny
# relative directory (to this dockerfile) not working for copy straight from monorepo
COPY ./docker/nginx.conf /etc/nginx/nginx.conf
COPY ./apps/ticket/dist /usr/share/nginx/html

