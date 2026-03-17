'use client'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#1a1a2e' }}>
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

      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 40 }}>Last updated: March 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>1. What We Collect</h2>
        <p>We collect information you provide directly: your name, email address, and the educational data you enter (student profiles, lesson plans, attendance records, etc.). We also collect basic usage data to improve the platform.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>2. How We Use Your Data</h2>
        <p>We use your data to:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Provide and improve the HomeschoolReady service</li>
          <li>Personalize AI-generated lesson plans and recommendations</li>
          <li>Send account-related communications (receipts, security alerts)</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>3. AI & Your Data</h2>
        <p>When you use AI features, your prompts and student context are sent to our AI provider to generate responses. We do not use your personal data to train AI models. We select AI providers who offer data protection agreements consistent with this policy.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>4. Data Sharing</h2>
        <p>We do not sell your personal data. We share data only with:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Service providers necessary to operate the platform (database, AI, email)</li>
          <li>Law enforcement when required by law</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>5. Children's Privacy</h2>
        <p>HomeschoolReady is used by parents and guardians to manage their children's education. We do not knowingly collect personal information directly from children. All data about students is entered by the parent or guardian account holder.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>6. Data Security</h2>
        <p>We use industry-standard security practices including encrypted connections (HTTPS), secure database storage, and row-level security to ensure users can only access their own data.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>7. Your Rights</h2>
        <p>You may request to access, correct, or delete your data at any time by contacting us. We will respond within 30 days.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>8. Data Retention</h2>
        <p>We retain your data as long as your account is active. When you delete your account, your data is removed within 30 days, except where retention is required by law.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>9. Changes to This Policy</h2>
        <p>We may update this policy periodically. We will notify you of material changes via email or in-app notice.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>10. Contact</h2>
        <p>Privacy questions? Email us at <a href="mailto:privacy@homeschoolready.com" style={{ color: '#7c3aed', fontWeight: 700 }}>privacy@homeschoolready.com</a>.</p>
      </section>
    </div>
    </div>
  )
}
