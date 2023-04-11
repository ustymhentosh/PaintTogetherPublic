from email.message import EmailMessage
import ssl
import smtplib



def send_email(email, token):
    """
    Sends email  
    """
    sender = 'paint.together.reset@gmail.com'
    password = 'password not to show on github'
    receiver = email

    subject = "Reset password"
    body = f"""
    Paint Together
    ============
    Here is a link to reset password
    --------------------------------------------
    http://127.0.0.1:5000/reset_password/{token}
    """

    em = EmailMessage()
    em['From'] = sender
    em['To'] = receiver
    em['Subject'] = subject
    em.set_content(body)

    context = ssl.create_default_context()

    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context = context) as smtp:
        smtp.login(sender, password)
        smtp.sendmail(sender, receiver, em.as_string())