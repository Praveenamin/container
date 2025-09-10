# Use a base Nginx image
FROM nginx:alpine

# Copy our custom nginx.conf file into the container
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copy the frontend application files into the container
COPY . /usr/share/nginx/html

# Expose port 80, the default for web traffic
EXPOSE 80

# The default command to start Nginx
CMD ["nginx", "-g", "daemon off;"]

