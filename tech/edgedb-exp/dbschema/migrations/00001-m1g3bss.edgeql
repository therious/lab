CREATE MIGRATION m1g3bssibyf75llexvwgzkmbzgvdbzxzqig4ls2b72apmtyhll3vva
    ONTO initial
{
  CREATE TYPE default::App {
      CREATE REQUIRED PROPERTY name: std::str;
  };
  CREATE TYPE default::User {
      CREATE REQUIRED PROPERTY name: std::str;
  };
  CREATE TYPE default::Role {
      CREATE MULTI LINK apps: default::App;
      CREATE MULTI LINK users: default::User;
      CREATE REQUIRED PROPERTY name: std::str;
  };
};
