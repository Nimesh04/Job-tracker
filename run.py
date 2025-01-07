import sqlite3
import bcrypt
from datetime import datetime 

status_bar = ['Applied', 'Rejected', 'Interview', 'Offer']

# create the tables for the database
def create_tables():
    connection  = sqlite3.connect("job_tracker.db")
    connection.execute("PRAGMA foreign_keys = ON")
    cursor = connection.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                password TEXT NOT NULL)
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS job_applications(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                company_name TEXT NOT NULL,
                date_applied TEXT NOT NULL,
                status TEXT NOT NULL,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id))
    '''
    )

    connection.commit()
    connection.close()


# register a user and add it to the database
def register_users(username, email, password):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        #checking if the username or the email already exsits in the database or not. if it doesn't then the new user is added.
        try:
            user_name = cursor.execute('''SELECT id FROM USERS WHERE username = ? or email= ?''',(username, email,))
            if user_name.fetchone():
                raise ValueError("Username or email already exists")
            else:
                cursor.execute('''
                        INSERT into USERS (username, email, password)
                        VALUES (?,?,?)''',(username, email, hashed_password))
        except sqlite3.IntegrityError as e:
            raise ValueError("Database constraint error: " + str(e))


# need to verify if the user is persent in the database or not.
def login(username, password):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()   
        # if the user is present, then need to use that user's id to do all the job addition in the database.
        try:
            cursor.execute('''
            SELECT password, id FROM USERS 
            WHERE username = ?
            ''', (username,))
            login_password = cursor.fetchone()
            stored_password = login_password[0]

            # if the user isn't present, prompt them by saying they aren't authorized.
            if not login_password:
                raise ValueError("Username not found.")

            if not isinstance(stored_password, bytes):
                stored_password = stored_password.encode('utf-8')

            if login_password and bcrypt.checkpw(password.encode('utf-8'), stored_password):
                return login_password[1]

        except ValueError:
            raise "Invalid Username or Password"

#check if the user_id exists
def user_exists(user_id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('''
            SELECT * from users 
            WHERE id = ?''', (user_id,))
        return cursor.fetchone() is not None


#add the jobs and all the detail in the table
def add_job(user_id, title, company_name, date_applied, status, notes = None):
    try:
        if not user_exists(user_id):
            raise ValueError(f"{user_id} doesn't exists.")
        
        #convert the date string into the date
        date = datetime.strptime(date_applied, '%Y-%m-%d').date()

        if status not in status_bar:
            raise ValueError(f"Invalid status. Allowed status are: {status_bar}")

        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()

            cursor.execute('''
                INSERT into job_applications (user_id, title, company_name, date_applied, status, notes)
                        VALUES(?,?,?,?,?,?)
                        ''', (user_id, title, company_name, date, status, notes))
    except sqlite3.IntegrityError as e:
        raise "Please use correct values."


def valid_id(id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('''
            SELECT id FROM job_applications WHERE id = ?
        ''', (id,))
        return cursor.fetchone() is not None



# remove the job based on the id from the job tracker database
def delete_jobs(id):
    try:
        if not valid_id(id):
            raise ValueError(f"{id} isn't available")
        
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''DELETE FROM job_applications Where id = ?''', (id,))
            return("Job application deleted successfully.")
    except sqlite3.IntegrityError as e:
        return "Provide valid id."


#update the status part of the job tracking
def update_status(user_id, id, new_status):
    try:
        if not valid_id(id):
            raise ValueError(f"{id} is an invalid ID.")
        if not user_exists(user_id):
            raise ValueError(f"{user_id} doesn't exist")
        if new_status not in status_bar:
            raise ValueError("Invalid status")
        
        with sqlite3.connect('job_tracker.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
                    UPDATE job_applications
                           SET status = ?
                           WHERE user_id= ? AND id = ?
                           ''', (new_status, user_id, id,))

    except sqlite3.IntegrityError as e:
        return "Use valid status"



# need to prompt the user to type in their username and password

# username = input("Enter your username:")
# password = input("Enter your password:")


#delete users account
def delete_users(username, id):
    with sqlite3.connect('job_tracker.db') as connection:
        cursor = connection.cursor()
        cursor.execute('DELETE FROM users WHERE username = ? and id = ? ', (username, id))


# with sqlite3.connect('job_tracker.db') as connection:
#     cursor = connection.cursor()
#     cursor.execute('SELECT * FROM users ')
#     users = cursor.fetchall()
#     for user in users:
#         print(user)


#Next things that need to be implemented
# Search and filter functionality for jobs
# Begin frontend integration
# implement user authentication for secure session managament  