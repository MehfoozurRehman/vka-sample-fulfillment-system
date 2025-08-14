import { Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';

export type VkaLayoutProps = {
  title: string;
  body: string;
  footerNote?: string;
};

export function VkaLayout({ title, body, footerNote }: VkaLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Heading as="h2" style={styles.brand}>
            VKA
          </Heading>
        </Section>
        <Section style={styles.card}>
          <Heading as="h3" style={styles.title}>
            {title}
          </Heading>
          <Text style={styles.text}>{body}</Text>
          <Hr style={styles.hr} />
          <Text style={styles.muted}>This is an automated message from VKA Sample Fulfillment System.</Text>
          {footerNote ? <Text style={styles.muted}>{footerNote}</Text> : null}
        </Section>
        <Section style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} VKA. All rights reserved.</Text>
        </Section>
      </Container>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f6f8fb',
    padding: '24px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
  },
  header: {
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center',
  },
  brand: {
    color: '#ffffff',
    margin: 0,
    letterSpacing: '2px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '20px',
    marginTop: '16px',
    boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
  },
  title: {
    color: '#0f172a',
    margin: '0 0 12px 0',
    fontSize: '18px',
  },
  text: {
    color: '#334155',
    fontSize: '14px',
    lineHeight: '22px',
    whiteSpace: 'pre-wrap',
  },
  hr: {
    borderColor: '#e2e8f0',
    margin: '16px 0',
  },
  muted: {
    color: '#64748b',
    fontSize: '12px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '16px',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: '12px',
  },
};

export default VkaLayout;
