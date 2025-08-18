import VkaLayout from './VkaLayout';

type InvitationProps = {
  title: string;
  name?: string | null;
  role: string;
  inviteUrl: string;
};

function Invitation({ title, name, role, inviteUrl }: InvitationProps) {
  const safeName = name && name.trim().length ? name : 'there';
  const body = `Hello ${safeName},

You have been invited to join VKA as a ${role}.

To accept the invitation and set up your account, please use the link below:
${inviteUrl}

If you did not expect this, you can ignore this email.

Best regards,
VKA Team`;

  return <VkaLayout title={title} body={body} />;
}

export default Invitation;
