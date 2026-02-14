import secrets


def main():
    print("JWT_SECRET_KEY=" + secrets.token_urlsafe(64))
    print("SESSION_SECRET=" + secrets.token_urlsafe(64))


if __name__ == "__main__":
    main()