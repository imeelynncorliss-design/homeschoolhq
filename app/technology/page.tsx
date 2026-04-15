'use client'

export default function TechnologyPage() {
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

      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Technology Policy</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Last updated: April 2026</p>
      <p style={{ marginBottom: 40 }}>
        HomeschoolReady is committed to transparency about the technology that powers our platform. This policy explains
        how our tools work, how your data flows through them, and what safeguards we have in place to protect your
        family's information.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>1. Overview</h2>
        <p>
          HomeschoolReady is a homeschool management platform that helps families track attendance, plan lessons,
          manage compliance, and generate educational content. The platform includes a built-in copilot called Scout
          that provides personalized recommendations, lesson plans, activities, and assessments based on your teaching
          style, your children's learning profiles, and your state's homeschool requirements.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>2. How Scout Works</h2>
        <p>
          Scout is HomeschoolReady's built-in copilot — a knowledgeable companion designed to assist with lesson
          planning, curriculum alignment, activity generation, and answering homeschool-related questions.
        </p>
        <p style={{ marginTop: 12 }}>
          When you interact with Scout, the following information may be sent to our technology provider to generate
          a response:
        </p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Your message or prompt</li>
          <li>Relevant context from your account (such as your child's grade level, learning style, and subjects)</li>
          <li>Your state's compliance requirements</li>
          <li>Relevant lesson or curriculum context if applicable</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          This information is used solely to generate a personalized response for you. It is not stored by our
          technology provider after the response is generated, and it is never used to train external models.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>3. What Scout Does Not Do</h2>
        <p>Scout is designed to assist and support your homeschool experience. However, there are important limitations:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Scout does not replace professional educational, legal, or medical advice</li>
          <li>Scout's generated content (lesson plans, activities, assessments) should be reviewed by you before use with your children</li>
          <li>Scout does not make decisions on your behalf — all educational choices remain yours</li>
          <li>Scout does not communicate directly with your children — it is a tool for the parent or guardian</li>
          <li>Scout does not access the internet, external websites, or third-party data sources during conversations</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>4. Technology Providers</h2>
        <p>
          HomeschoolReady uses carefully selected third-party providers to deliver the platform. Each provider is
          evaluated for data protection practices, reliability, and compliance with our privacy standards.
        </p>
        <p style={{ marginTop: 12 }}>Our core technology stack includes providers for:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Application hosting and deployment</li>
          <li>Database storage and authentication</li>
          <li>Content generation (Scout copilot)</li>
          <li>Email delivery for account communications</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          We do not disclose specific provider names in this policy to maintain operational security. However, we are
          happy to discuss our provider selection criteria upon request. Contact us at{' '}
          <a href="mailto:support@homeschoolready.app" style={{ color: '#7c3aed', fontWeight: 700 }}>
            support@homeschoolready.app
          </a>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>5. Data Flow and Processing</h2>
        <p>When you use HomeschoolReady, your data flows through the following stages:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><strong>Input:</strong> You enter educational data (student profiles, lessons, attendance) or interact with Scout</li>
          <li><strong>Processing:</strong> Your data is processed by our application servers and, when using Scout, sent to our content generation provider</li>
          <li><strong>Storage:</strong> Your educational data is stored in our secure database. Scout conversations are stored in your account for your reference</li>
          <li><strong>Output:</strong> Generated content (lesson plans, activities, reports) is delivered back to you within the platform</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          At no point in this flow is your data shared with advertisers, sold to third parties, or used for purposes
          unrelated to delivering and improving your HomeschoolReady experience.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>6. Data Protection Safeguards</h2>
        <p>We implement the following safeguards to protect your family's data:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Encrypted connections (HTTPS/TLS) for all data in transit</li>
          <li>Encrypted database storage for data at rest</li>
          <li>Row-level security ensuring users can only access their own data</li>
          <li>Authentication and session management to protect account access</li>
          <li>Regular review of provider data protection agreements</li>
          <li>No use of your data to train external machine learning models</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>7. Content Generation Limits and Tiers</h2>
        <p>Scout's content generation capabilities vary by plan:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Free and Essential plans include a limited number of monthly generations (lesson plans, activities, and chat messages)</li>
          <li>Pro and Premium plans include unlimited generation with full Scout capabilities</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Generation limits are in place to manage platform costs and ensure consistent performance for all users.
          Specific limits for each tier are listed on our{' '}
          <a href="/pricing" style={{ color: '#7c3aed', fontWeight: 700 }}>pricing page</a>.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>8. Accuracy and Review</h2>
        <p>
          Content generated by Scout is created based on the context you provide and general educational knowledge.
          While we strive for accuracy and relevance, generated content may occasionally contain errors, omissions,
          or suggestions that do not fit your specific situation.
        </p>
        <p style={{ marginTop: 12 }}>
          We strongly recommend that you review all generated lesson plans, activities, and assessments before using
          them with your children. You are the expert on your family's educational needs — Scout is a tool to support
          you, not replace your judgment.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>9. State Compliance Data</h2>
        <p>
          HomeschoolReady provides compliance tracking for all 50 states. State requirements (attendance days,
          required subjects, reporting obligations) are maintained in our database and updated regularly.
        </p>
        <p style={{ marginTop: 12 }}>
          While we make every effort to keep compliance data accurate and current, homeschool laws can change. We
          recommend verifying requirements with your state's department of education or a legal resource such as{' '}
          <a href="https://hslda.org/legal" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 700 }}>
            HSLDA (hslda.org/legal)
          </a>{' '}
          for the most up-to-date information.
        </p>
        <p style={{ marginTop: 12 }}>
          Compliance data is provided as a reference tool and does not constitute legal advice.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>10. Your Rights</h2>
        <p>You have the right to:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Know what data Scout accesses when generating content for you</li>
          <li>Export all your educational data at any time</li>
          <li>Delete your account and all associated data (processed within 30 days)</li>
          <li>Opt out of Scout features and use HomeschoolReady as a manual tracking tool</li>
          <li>Contact us with questions about how your data is processed</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>11. Changes to This Policy</h2>
        <p>
          We may update this Technology Policy as our platform evolves. Material changes will be communicated via
          email or in-app notification. Continued use of HomeschoolReady after changes are communicated constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>12. Contact</h2>
        <p>Questions about this Technology Policy or how Scout works?</p>
        <p style={{ marginTop: 8 }}>
          Email us at{' '}
          <a href="mailto:support@homeschoolready.app" style={{ color: '#7c3aed', fontWeight: 700 }}>
            support@homeschoolready.app
          </a>
        </p>
        <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
          HomeschoolReady, LLC · North Carolina, USA
        </p>
      </section>
    </div>
    </div>
  )
}
