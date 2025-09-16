import json
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Enable CORS for cross-origin requests from the frontend

# In-memory database to store user and announcement data
# In a production environment, this would be replaced by a real database like Firestore
users_db = {
    "admin@portal.com": {
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@portal.com",
        "role": "admin",
        "password": "adminpassword",
        "locked": False,
        "details": {
            "designation": "Administrator",
            "phone": "N/A",
            "altPhone": "N/A",
            "address": "N/A",
            "assets": {
                "assetType": "N/A",
                "serialNumber": "N/A",
                "cpu": "N/A",
                "ram": "N/A",
                "networkIp": "N/A",
                "monitors": "N/A",
                "keyboard": False,
                "mouse": False
            }
        }
    }
}
announcements_db = []

@app.route('/api/login', methods=['POST'])
def login():
    """Handles user login authentication."""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = users_db.get(email)
    
    if not user or user.get('password') != password:
        return jsonify({"message": "Invalid credentials"}), 401
    
    if user.get('locked'):
        return jsonify({"message": "Your account has been locked. Please contact an administrator."}), 403
        
    return jsonify({"message": "Login successful", "user": user}), 200

@app.route('/api/users', methods=['GET'])
def get_users():
    """Returns a list of all users."""
    return jsonify(list(users_db.values())), 200

@app.route('/api/users', methods=['POST'])
def add_user():
    """Adds a new user to the database."""
    try:
        data = request.json
        print("Received data for new user:", json.dumps(data, indent=2))
        email = data.get('email')
        
        if email in users_db:
            return jsonify({"message": "User with this email already exists"}), 409

        # Ensure required fields are present
        required_fields = ['firstName', 'lastName', 'email', 'password', 'details']
        if not all(field in data for field in required_fields):
            return jsonify({"message": "Missing required user fields"}), 400

        new_user = {
            "firstName": data['firstName'],
            "lastName": data['lastName'],
            "email": email,
            "password": data['password'],
            "role": "employee", # Default role for new users
            "locked": False,
            "details": data['details']
        }
        users_db[email] = new_user
        return jsonify({"message": "User added successfully", "user": new_user}), 201

    except json.JSONDecodeError:
        return jsonify({"message": "Invalid JSON in request body"}), 400
    except Exception as e:
        print(f"Error adding user: {e}")
        return jsonify({"message": "An internal server error occurred"}), 500

@app.route('/api/users/<email>', methods=['PUT'])
def edit_user(email):
    """Updates an existing user's details."""
    try:
        data = request.json
        print(f"Received data to edit user '{email}':", json.dumps(data, indent=2))
        if email not in users_db:
            return jsonify({"message": "User not found"}), 404

        user = users_db[email]
        user["firstName"] = data.get('firstName', user["firstName"])
        user["lastName"] = data.get('lastName', user["lastName"])
        user["details"] = data.get('details', user['details'])
        
        return jsonify({"message": "User updated successfully", "user": user}), 200
        
    except json.JSONDecodeError:
        return jsonify({"message": "Invalid JSON in request body"}), 400
    except Exception as e:
        print(f"Error editing user: {e}")
        return jsonify({"message": "An internal server error occurred"}), 500

@app.route('/api/users/<email>', methods=['DELETE'])
def delete_user(email):
    """Deletes a user from the database."""
    if email in users_db:
        del users_db[email]
        return jsonify({"message": f"User '{email}' deleted successfully"}), 200
    return jsonify({"message": "User not found"}), 404

@app.route('/api/users/<email>/lock', methods=['PUT'])
def toggle_lock(email):
    """Toggles the locked status of a user."""
    user = users_db.get(email)
    if user:
        user['locked'] = not user['locked']
        status = "locked" if user['locked'] else "unlocked"
        return jsonify({"message": f"User '{email}' {status} successfully"}), 200
    return jsonify({"message": "User not found"}), 404


# Placeholder for future announcement routes
@app.route('/api/announcements', methods=['POST'])
def add_announcement():
    data = request.json
    announcements_db.append(data.get('message'))
    return jsonify({"message": "Announcement published successfully"}), 200

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    return jsonify(announcements_db), 200

if __name__ == '__main__':
    app.run(host='23.82.14.235', port=5005)

