import smtplib 
from email.message import EmailMessage
from pydantic import EmailStr
from config import settings
import queue



def sendEmail(email : EmailStr, subject: str, content : str):
    smtp_server = "smtp.gmail.com"
    port = 587
    sender_email = settings.smtp_google_email
    password = settings.smtp_google_pass
    receiver_email = email

    msg = EmailMessage()

    msg["subject"] = subject
    msg["From"] = sender_email
    msg["to"] = receiver_email
    msg.set_content(content)

    try:
        print("******************sending email")
        with smtplib.SMTP(smtp_server, port) as server:
            server.starttls()
            server.login(sender_email, password)
            server.send_message(msg)
            print("message sent")
    except Exception as e:
        print("[sending email error] : ", e)
        return {"error": "internal server error", "description" : e}