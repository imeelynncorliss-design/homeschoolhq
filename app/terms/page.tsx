'use client'

export default function TermsPage() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px',
      fontFamily: "'Nunito', sans-serif", color: '#1a1a2e', lineHeight: 1.7,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <a href="/" style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>
          ← Back to HomeschoolReady
        </a>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 40 }}>Last updated: March 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>1. Acceptance of Terms</h2>
        <p>By creating an account and using HomeschoolReady, you agree to these Terms of Service. If you do not agree, please do not use the platform.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>2. Who Can Use HomeschoolReady</h2>
        <p>HomeschoolReady is designed for adults (18+) who are responsible for a child's education. By using this platform, you confirm that you are at least 18 years of age.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>3. Your Account</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>4. AI-Generated Content</h2>
        <p>HomeschoolReady uses AI to help generate lesson plans, activities, and recommendations. AI-generated content is provided as a starting point and should be reviewed by you before use. We do not guarantee the accuracy, completeness, or suitability of AI-generated content for your specific educational needs.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>5. Subscription & Billing</h2>
        <p>Paid plans are billed annually. You may cancel at any time; cancellation takes effect at the end of your current billing period. We do not offer refunds for partial periods.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>6. Your Data</h2>
        <p>You own the data you enter into HomeschoolReady. We will not sell your personal data to third parties. See our <a href="/privacy" style={{ color: '#7c3aed', fontWeight: 700 }}>Privacy Policy</a> for full details on how we handle your data.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>7. Acceptable Use</h2>
        <p>You agree not to misuse the platform, attempt to circumvent usage limits, or use the service in any way that violates applicable laws or regulations.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>8. Limitation of Liability</h2>
        <p>HomeschoolReady is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>9. Changes to These Terms</h2>
        <p>We may update these terms from time to time. We will notify you of significant changes via email or in-app notice. Continued use after changes constitutes acceptance.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>10. Contact</h2>
        <p>Questions about these terms? Email us at <a href="mailto:support@homeschoolready.com" style={{ color: '#7c3aed', fontWeight: 700 }}>support@homeschoolready.com</a>.</p>
      </section>
    </div>
  )
}
