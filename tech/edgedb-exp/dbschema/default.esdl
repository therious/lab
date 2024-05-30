module default {
  type App {
    required name: str;
  }

  type User {
    required name: str;
  }

  type Role {
    required name: str;
    multi apps: App;
    multi users: User;
  }

}
