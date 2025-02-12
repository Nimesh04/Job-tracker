import os
import sqlite3
import bcrypt
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    current_user,
    logout_user,
    login_required
)
import psycopg2
DATABASE_URL = os.environ.get("DATABASE_URL")
connection = psycopg2.connect(DATABASE_URL)


app = Flask(__name__)
app.secret_key = "supersecretkey"

# Initialize Flask-Login
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'  # Redirects unauthorized users to the login page

status_bar = ['Applied', 'Rejected', 'Interview', 'Offer']

# Define a User class for Flask-Login
class User(UserMixin):
    def __init__(self, id, username, fName, lName, email, password):
        self.id = id
        self.username = username
        self.fName = fName
        self.lName = lName
        self.email = email
        self.password = password

# User loader callback for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, username, fName, lName, email, password FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user is None:
            return None
        return User(*user)

# Create the tables for the database
def create_tables():
    connection = sqlite3.connect("job_tracker.db")
    connection.execute("PRAGMA foreign_keys = ON")
    cursor = connection.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            fName TEXT NOT NULL,
            lName TEXT NOT NULL,
            email TEXT NOT NULL,
            password TEXT NOT NULL)
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS job_applications(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            company_name TEXT NOT NULL,
            link TEXT NOT NULL,
            date_applied TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id))
    ''')
    connection.commit()
    connection.close()

@app.route("/")
def home():
    return render_template("login_page.html")

@app.route("/sign_up")
def sign_up():
    flash_message = session.pop("flash_message", None)
    return render_template("sign_up.html", flash_message=flash_message)


@app.route("/login_page")
def login_page():
    flash_message = session.pop("flash_message", None)  # Pop message when rendering
    return render_template("login_page.html", flash_message=flash_message)


@app.route("/dashboard")
@login_required
def dashboard():
    flash_message = session.pop("flash_message", None)
    user_id = current_user.id
    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM job_applications WHERE user_id = ?", (user_id,))
        results = cursor.fetchall()
    return render_template("dashboard.html", results=results, flash_message=flash_message)


# Register a new user (includes first and last names)
@app.route("/register_users", methods=["POST"])
def register_users():
    fName = request.form["fName"]
    lName = request.form["lName"]
    username = request.form["username"]
    email = request.form["email"]
    password = request.form["password"]
    confirm_password = request.form["confirm_password"]

    if not username or not email or not password:
        session["flash_message"]= {"message":"All fields are required!", "category": "error"}
        return redirect(url_for("sign_up"))
    
    if password != confirm_password:
        session["flash_message"]= {"message":"Passwords do not match", "category": "error"}
        return redirect(url_for("sign_up"))
    
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        try:
            cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
            if cursor.fetchone():
                session["flash_message"]= {"message":"Username or email already exists", "category":"error"}
                return redirect(url_for("sign_up"))
            
            cursor.execute("INSERT INTO users (fName, lName, username, email, password) VALUES (?,?,?,?,?)",
                           (fName, lName, username, email, hashed_password))
            connection.commit()
            session["flash_message"] = {"message":"Registration successful! Please log in.", "category": "success"}
            return redirect(url_for("login_page"))
        except sqlite3.IntegrityError as e:
            session["flash_message"]= {"message": "Database constraint error: " + str(e) , "category": "error"} 
            return redirect(url_for("sign_up"))

# Login endpoint using Flask-Login's login_user
@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    password = request.form["password"]

    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, password, username, email FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()

        if not result:
            session["flash_message"] = {"message": "Invalid username or password.", "category": "error"}
            return redirect(url_for("login_page"))  # Redirect back to login with flash message

        # Unpack only if a result exists
        user_id, stored_password, user_name, user_email = result

        if bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
            cursor.execute("SELECT id, username, fName, lName, email, password FROM users WHERE username = ?", (username,))
            user_data = cursor.fetchone()
            user = User(*user_data)
            login_user(user)
            session["flash_message"] = {"message": "Login successful!", "category": "success"}
            return redirect(url_for("dashboard"))
        else:
            session["flash_message"] = {"message": "Invalid username or password.", "category": "error"}
            return redirect(url_for("login_page"))  # Redirect with flash message


# Logout endpoint
@app.route('/logout')
@login_required
def logout():
    logout_user()
    session["flash_message"] = {"message": "You've been successfuly log out.", "category": "success"}
    return redirect(url_for('login_page'))

# Add a job application (requires login)
@app.route("/add_job", methods=["POST"])
@login_required
def add_job():
    data = request.get_json()
    user_id = current_user.id
    company = data.get("company")
    title = data.get("title")
    status = data.get("status")
    link = data.get("link")
    date_applied = data.get("date_applied")
    notes = data.get("notes")

    if not company or not title or not status or not date_applied:
        return jsonify({"success": False, "message": "All fields are required!"})
    
    try:
        date = datetime.strptime(date_applied, '%Y-%m-%d').date()
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
                INSERT INTO job_applications (user_id, title, company_name,link, date_applied, status, notes)
                VALUES (?, ?, ?,?, ?, ?, ?)
            ''', (user_id, title, company, link, date, status, notes))
            connection.commit()
        return jsonify({"success": True, "message": "Job added successfully!"})
    except sqlite3.IntegrityError as e:
        return jsonify({"success": False, "message": str(e)})

def user_exists(user_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        return cursor.fetchone() is not None

def valid_id(job_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('SELECT id FROM job_applications WHERE id = ?', (job_id,))
        return cursor.fetchone() is not None

@app.route('/delete-job', methods=["POST"])
@login_required
def delete_jobs():
    try:
        data = request.get_json()
        job_ids = data.get("job_ids", [])
        if not job_ids:
            return jsonify({"success": False, "message": "No job IDs provided."})
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.executemany("DELETE FROM job_applications WHERE id = ?",
                               [(job_id,) for job_id in job_ids])
        return jsonify({"success": True, "message": "Job(s) deleted successfully."})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Invalid job ID(s) provided."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    

@app.route("/update_job_status", methods=["POST"])
@login_required
def update_status():
    data = request.get_json()
    job_id = data.get("job_id")
    new_status = data.get("new_status")

    print("Received data:", data)

    if not job_id or not new_status:
        return jsonify({"success": False, "message": "Invalid request parameters."})
    
    with sqlite3.connect("job_tracker.db") as connection:
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE job_applications
                       SET status = ?
                       WHERE id = ? AND user_id = ?
                       """, (new_status, job_id, current_user.id))
        connection.commit()

    return jsonify({"success": True, "message": "Status updated successfully!"})

def delete_users(username, user_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM users WHERE username = ? AND id = ?', (username, user_id))
        connection.commit()

@app.route("/delete_account", methods=["POST"])
@login_required
def delete_account():
    try:
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('DELETE FROM users WHERE id = ?', (current_user.id,))
            connection.commit()
        logout_user()
        flash("Your account has been deleted.", "success")
        return jsonify({"success": True, "redirect": url_for("sign_up")})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/search", methods=["POST"])
@login_required
def search():
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"success": False, "message": "Search query is empty."})

    user_id = current_user.id
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT * FROM job_applications
            WHERE user_id = ? 
            AND (company_name LIKE ? OR title LIKE ? OR notes LIKE ?)
        """, (user_id, f'%{query}%', f'%{query}%', f'%{query}%'))

        results = cursor.fetchall()

    jobs = []
    for row in results:
        jobs.append({
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "company_name": row[3],
            "link": row[4],
            "date_applied": row[5],
            "status": row[6],
            "notes": row[7]
        })

    return jsonify({"success": True, "results": jobs})


@app.route("/advanced_filter", methods=["POST"])
@login_required
def advanced_filter():
    data = request.get_json()
    statuses = data.get("status", [])
    date_from = data.get("date_from", None)
    date_to = data.get("date_to", None)
    
    query = "SELECT * FROM job_applications WHERE user_id = ?"
    params = [current_user.id]
    
    if statuses:
        placeholders = ','.join('?' * len(statuses))
        query += f" AND status COLLATE NOCASE IN ({placeholders})"
        params.extend(statuses)
    
    if date_from:
        query += " AND date_applied >= ?"
        params.append(date_from)
    
    if date_to:
        query += " AND date_applied <= ?"
        params.append(date_to)
    
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()
    
    jobs = []
    for row in results:
        jobs.append({
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "company_name": row[3],
            "link": row[4],
            "date_applied": row[5],
            "status": row[6],
            "notes": row[7]
        })
    return jsonify({"success": True, "results": jobs})


@app.route("/clear_flash", methods=["POST"])
def clear_flash():
    session.pop("flash_message", None)  # Remove flash message from session
    return "", 204  # Respond with no content


if __name__ == "__main__":
    create_tables()
    app.run(debug=True)
