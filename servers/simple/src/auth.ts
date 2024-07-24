// import {WorkOS} from '@workos-inc/node';  // switching away from workos towards supabase auth
import {FastifyReply, FastifyRequest} from 'fastify';

const workos =
  { userManagement:
    {  getAuthorizationUrl:       (..._:unknown[])=>'bogus.com',
      authenticateWithCode: async (..._:unknown[])=>({user: {}}),
    }
  }; //new WorkOS(process.env.WORKOS_API_KEY);
const foundClientId = process.env.WORKOS_CLIENT_ID;

const clientId = foundClientId ?? '';
const provider = 'authkit';            // Specify that we'd like AuthKit to handle the authentication flow
let redirectUri = '';                  // endpoint that WorkOS will redirect to after a user authenticates
const HttpStatusTeapot = 418;          // a bizarre error, so std statuscode for misconfigured server


export const setAuthRedirectUrl = (url: string)=> {
  console.log('setAuthRedirectUrl', url);
  redirectUri = url
};

const workingResponder = async (_req:FastifyRequest, res:FastifyReply)=>
{
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({provider, redirectUri, clientId});
  res.redirect(authorizationUrl);    // Redirect the user to the AuthKit sign-in page
};


// this callback is should be triggered by the authResponder
const workingCallback = async (req:unknown, reply:FastifyReply)=>
{
  type authResponse = {code: any};

  const {code = '**missing code**'} = (<any>req).query as authResponse;  // The authorization code returned by AuthKit
  const { user } = await workos.userManagement.authenticateWithCode({code, clientId});
  console.log(`user authenticated with code ${code}`, user);

  // Redirect the user to the homepage
  reply.redirect('/');
};


// how we respond to auth requests when we are not configured properly
const configErrorResponder =  async (_req:FastifyRequest, reply:FastifyReply)=>
{
  const status = HttpStatusTeapot
  reply.statusCode = status;
  reply.send({status, message: 'missing secrets, Authenticator ClientId unavailable' });
}

const nullCallback = async (_req:unknown, reply:FastifyReply)=>{ reply.redirect('/');};

export const authResponder         = foundClientId? workingResponder: configErrorResponder;
export const authCallbackResponder = foundClientId?  workingCallback: nullCallback;
