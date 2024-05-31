# Secrets Management

`I have no idea, what I'm doing everyone has to start somewhere. Please jump in and fix this`

## Short version of setup
* Secrets live on doppler
* Doppler has Fly.io integration
* Fly.io has its own secrets manager, that makes secrets appear as environment variables
* With the integration, all doppler secrets for specified environment tied to a fly.io app:
  * flow straight to env variables on the deployed app.
  * force an app reboot if you modify a connected doppler secret (WATCH OUT)  


<hr/>
## Givens
* storing secrets for named environments in Doppler
* using Fly.io for deployment of servers (for now)
  * clearly, pattern needs to be not incompatible with other deployment strategies
* apps deployed to fly.io need (limited) access to a set of doppler secrets

## Steps taken (per some existing recommendations)
* install flyctl via brew (for launching apps on fly.io)
  * flyctl is useful for basic stuff like provisioning appids
  * the pattern of using flyctl from a dev machine to deploy might not be ideal
  * another possibility is a github action
  * investigate fly.io's other pattern that works with a **fork** of the github repo
* install gnupg on developer machine (via brew), required by doppler
* install doppler cli also via brew (v3.68.0)  (doppler needs gnugpg)
* run doppler setup
  * configure a doppler.yaml at root of lab project for doppler to use
    * a yaml hierarchy at different app levels also works (each can access its own secrets)
* now that there is a doppler setup, you can use the doppler run command
  * doppler run wraps a command of our choice with a temporary environment loaded with secrets
    *  the doppler.yaml hierarchy determines which doppler environment is mapped to the doppler run
        *  facilitates dev vs staging vs production secrets 
  * the script or appruns doppler run to do something with the secrets
* use doppler's fly.io integration
  * fly.io: create an token for doppler to use with any given fly.io appid
  * doppler: apply integration by copying in the fly.io token
  * have to test how integration works exactly (haven't seen a doc)
    * is it now environment variable magic delivered straight to the container running the app?
      * it speaks of updating variables on apps when the secrets themselves change
      
