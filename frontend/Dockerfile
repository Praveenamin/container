Use a lightweight nginx image
FROM nginx:alpine

Copy the HTML file into the nginx public directory
COPY index.html /usr/share/nginx/html

Expose port 3338
EXPOSE 3338

The default command runs nginx
CMD ["nginx", "-g", "daemon off;"]
