import json
from flask import session, Flask, render_template, request, redirect, url_for
from flask import session, Flask, render_template, request, redirect, url_for
from firebase_admin import credentials, firestore, initialize_app, auth
from firebase_admin import db as rtdb
from firebase_admin import db as rtdb
import requests
from time import time as cur_time
from time import ctime
from time import strptime, mktime
from pswrd_reset_handler import send_email
import uuid
import os

app = Flask(__name__)
cred = credentials.Certificate("key.json")

initialize_app(cred, {'databaseURL': "https://psychopixels-f8b24-default-rtdb.europe-west1.firebasedatabase.app"})

app.secret_key = 'secret'
name_colector = {}

db = firestore.client()
grid_ref = db.collection('test').document('test')
chat_ref = rtdb.reference('/')

token = 'noreset'


def sign_in_with_email_and_password(email, password):
    url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBup8fN1NiVc008-jxIngqb_Wt1xT9eIIM'
    payload = {
        'email': email,
        'password': password,
        'returnSecureToken': True}

    response = requests.post(url, data=json.dumps(payload))

    if response.status_code == 200:
        return True
    else:
        return response.json()['error']['message']


@app.route('/')
def welcome_page():
    """
    Loads the welcome page
    """
    if 'user' in session:
        del session['user']
    return render_template('welcome_page.html')



@app.route('/register', methods = ['POST', 'GET'])
def signup_page():
    """
    Register form
    """
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name')
        try:
            user = auth.create_user(email=email, password=password, display_name=name)

            db.collection('timer').document(email).set({'time': cur_time()})
            db.collection('history').document(email).set({ctime(cur_time()): 'SIGN UP'})

            session['user'] = email
            session['name'] = name

            success_msg = "Successfully registered!"

            old = chat_ref.child('conversation').get()
            new = old + f'<em>[{session["name"]}]</em> Joined!<br>'
            chat_ref.child('conversation').set(new)

            return render_template('register_page.html', success_msg=success_msg)
        except Exception as e:
            reg_error = e
            return render_template('register_page.html', reg_error=reg_error)
    else:
        return render_template('register_page.html')



@app.route('/login', methods = ['POST', 'GET'])
def login_page():
    """
    Login form
    """
    if 'user' in session:
        del session['user']

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        try:
            user = sign_in_with_email_and_password(email, password)
            if user==True:
                user = auth.get_user_by_email(email)
                session['user'] = user.email
                session['name'] = user.display_name
                return redirect('/main_page')
            else:
                raise Exception()
        except Exception as e:
            login_error = f"Failed to log in. Please check your email and password and try again.({user})"
            return render_template('login_page.html', login_error=login_error)

    return render_template('login_page.html')


@app.route('/main_page', methods=['GET', 'POST'])
def main_page():
    '''
    Loads the main page
    '''
    if 'user' in session:
        user_limit = db.collection('timer').document(
            session['user']).get().to_dict()['time']
        if user_limit > cur_time():
            timer_command = user_limit - cur_time()
        else:
            timer_command = True

        return render_template('main_page.html', restart_timer=True, grid=json.dumps(grid_ref.get().to_dict()),
                               access=True, timer_command=timer_command)
    return render_template('main_page.html',
                           grid=json.dumps(grid_ref.get().to_dict()), access=False,
                           timer_command=False)


@app.route('/update_grid', methods=['GET'])
def update_data():
    """
    Sends the updated data
    """
    return json.dumps(grid_ref.get().to_dict())


@app.route('/update_chat', methods=['GET', 'POST'])
def update_chat():
    """
    Updates chat
    """
    if request.method == "GET":
        return chat_ref.child('conversation').get()
    if request.method == 'POST':
        message = request.data.decode('utf-8')
        if message == '' or len(message) == message.count(' '):
            return 'OK'
        old = chat_ref.child('conversation').get()
        new = old + f'<em>[{session["name"]}]</em> {message}<br>'
        chat_ref.child('conversation').set(new)
        return 'OK'
        


@app.route('/save_grid', methods=['POST'])
def send_data():
    """
    Receives the updated data
    """
    content = request.get_json()
    grid_ref.update(content)

    return 'OK'


@app.route('/change_timere_in_db', methods=['POST'])
def change_timere_in_db():
    """
    Changes timer of the user
    """
    db.collection('timer').document(
        session['user']).update({'time': cur_time() + 20})
    return 'OK'


@app.route('/make_history', methods=['POST'])
def make_history_in_db():
    """
    Writes history
    """
    content = request.get_json()
    entries = db.collection('history').document(session['user']).get().to_dict()

    entries[ctime(cur_time())] = content
    
    db.collection('history').document(session['user']).set(entries)

    return 'OK'


@app.route('/account_page')
def account_page():
    """
    Users account
    """
    if 'user' not in session:
        return 'ACCESS DENIED'
    history = db.collection('history').document(session['user']).get().to_dict()
    result = []
    for j in history:
        if history[j] != 'SIGN UP':
            x, y = list(history[j].keys())[0].split()
            color = list(history[j].values())[0]
            history[j] = f'x = {x} | y = {y} | color = {color}'
        result.append([j, history[j]])
    return render_template('account_page.html', name = session['name'], email = session['user'],
                            history = sorted(result, key = lambda x: int(mktime(strptime(x[0], "%a %b %d %H:%M:%S %Y"))), reverse=True))


@app.route('/reset_password', methods=['POST', 'GET'])
def reset_password():
    """
    Reset password
    """
    if request.method == 'POST':
        email = request.form.get('email')
        token = str(uuid.uuid4())
        session['reset_token'] = token
        send_email(email, token)
        return render_template('reset_password.html', sent = True)
    return render_template('reset_password.html', sent = False)


@app.route('/reset_password/<token>', methods=['POST', 'GET'])
def create_reset_page(token):
    """
    Creates reset page
    """
    stored_token = session.get('reset_token')
    if stored_token is None or stored_token != token:
        return 'ACCESS DENIED'
    
    if request.method == 'POST':
        email = request.form.get('email')
        password_c = request.form.get('password')
        confirmpassword = request.form.get('confirmpassword')
        if confirmpassword != password_c:
            change_password = "Failed to change password: Passwords do not match."
            return render_template('change_password_page.html', change_password = change_password)
        
        try:
            users_id = auth.get_user_by_email(email).uid
            auth.update_user(users_id, password=password_c)
            return redirect(url_for('welcome_page', change_password = True))
        
        except Exception as e:
            change_password = "The user does not exist. Enter the correct data"
            return render_template('change_password_page.html', change_password = change_password)
    return render_template('change_password_page.html')



@app.route('/chat', methods=['POST', 'GET'])
def chat():
    """
    Render Chat
    """
    if 'user' not in session:
        return 'ACCESS DENIED'
    return render_template('chat.html')


if __name__ == "__main__":
    app.run(debug=True)
