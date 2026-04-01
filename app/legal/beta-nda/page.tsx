'use client'

export default function BetaNDAPage() {
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

        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Beta Tester Non-Disclosure Agreement</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 40 }}>
          Effective as of the date of electronic acceptance &nbsp;·&nbsp; Version 1.0 &nbsp;·&nbsp; April 2026
        </p>

        <div style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4b5563', fontWeight: 600 }}>
            This agreement is between <strong style={{ color: '#1a1a2e' }}>HomeschoolReady, LLC</strong> ("Company") and you,
            the individual who accepts this agreement electronically ("Beta Tester"). By checking the acceptance box during
            account setup, you agree to be bound by all terms below.
          </p>
        </div>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>1. Purpose</h2>
          <p>
            HomeschoolReady, LLC is developing HomeschoolReady, an AI-powered homeschool management platform (the "Beta
            Product"). You have been invited to participate in a closed beta program to test the Beta Product prior to its
            commercial release. This Agreement governs your access to and use of the Beta Product and any related
            Confidential Information.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>2. Confidential Information</h2>
          <p>"Confidential Information" means all non-public information disclosed by Company to Beta Tester in connection
          with the beta program, including but not limited to:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Software features, design, user interface, and functionality</li>
            <li>Unreleased product roadmap and planned features</li>
            <li>Bug reports, test results, and performance data</li>
            <li>Pricing, business plans, and marketing strategies</li>
            <li>Any other information marked as confidential or that a reasonable person would understand to be confidential</li>
          </ul>
          <p style={{ marginTop: 12 }}>Confidential Information does <strong>not</strong> include information that:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Is or becomes publicly available through no act or omission of Beta Tester;</li>
            <li>Beta Tester already lawfully knew at the time of disclosure; or</li>
            <li>Beta Tester receives from a third party without any confidentiality restriction.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>3. Beta Tester Obligations</h2>
          <p>Beta Tester agrees to:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Keep all Confidential Information strictly confidential and not disclose it to any third party without prior written consent from Company;</li>
            <li>Use Confidential Information only for the purpose of evaluating and testing the Beta Product;</li>
            <li>Not screenshot, record, livestream, or publicly share any aspect of the Beta Product without Company's written permission;</li>
            <li>Not reverse engineer, decompile, or attempt to derive source code from the Beta Product;</li>
            <li>Promptly notify Company at <a href="mailto:legal@homeschoolready.app" style={{ color: '#7c3aed', fontWeight: 700 }}>legal@homeschoolready.app</a> if Beta Tester becomes aware of any unauthorized disclosure of Confidential Information.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>4. Feedback</h2>
          <p>
            Beta Tester may provide feedback, suggestions, bug reports, and ideas regarding the Beta Product ("Feedback").
            Beta Tester agrees that Company may freely use, incorporate, and commercialize Feedback without any obligation,
            royalty, or compensation to Beta Tester. Beta Tester waives any moral rights or other rights in such Feedback
            to the fullest extent permitted by law.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>5. No License or Ownership</h2>
          <p>
            Nothing in this Agreement grants Beta Tester any intellectual property rights in the Beta Product, its
            underlying technology, or any Confidential Information. All rights not expressly granted remain with
            HomeschoolReady, LLC.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>6. Term and Termination</h2>
          <p>
            This Agreement is effective from the date of electronic acceptance and continues until the earlier of:
            (a) the Beta Product's public commercial release, or (b) Company's written notice to Beta Tester that the
            beta program has ended. Upon termination, Beta Tester shall immediately cease using the Beta Product and
            destroy or delete any Confidential Information in their possession.
          </p>
          <p style={{ marginTop: 8 }}>
            Company may terminate Beta Tester's access at any time, for any reason, without notice.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>7. Disclaimer of Warranties</h2>
          <p>
            THE BETA PRODUCT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. HOMESCHOOLREADY, LLC
            MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THE BETA PRODUCT MAY CONTAIN BUGS, ERRORS, OR INSTABILITIES.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>8. Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL HOMESCHOOLREADY, LLC BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES ARISING OUT OF BETA TESTER'S PARTICIPATION IN THE BETA PROGRAM OR USE OF THE BETA PRODUCT,
            EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>9. Governing Law</h2>
          <p>
            This Agreement shall be governed by and construed in accordance with the laws of the State of North Carolina,
            without regard to its conflict of law provisions. Any disputes arising under this Agreement shall be resolved
            exclusively in the state or federal courts located in North Carolina, and Beta Tester consents to personal
            jurisdiction in such courts.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>10. Entire Agreement</h2>
          <p>
            This Agreement, together with HomeschoolReady's Terms of Service and Privacy Policy, constitutes the entire
            agreement between the parties with respect to the beta program and supersedes all prior or contemporaneous
            agreements, representations, and understandings relating to its subject matter.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>11. Electronic Acceptance</h2>
          <p>
            By checking the acceptance box during account setup, Beta Tester acknowledges that they have read, understood,
            and agree to be legally bound by this Agreement. Electronic acceptance constitutes a valid and binding
            signature under applicable law, including the Electronic Signatures in Global and National Commerce Act
            (E-SIGN). The date, time, and Beta Tester's account information are recorded at the time of acceptance.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>12. Contact</h2>
          <p>
            Questions about this Agreement? Contact us at{' '}
            <a href="mailto:legal@homeschoolready.app" style={{ color: '#7c3aed', fontWeight: 700 }}>
              legal@homeschoolready.app
            </a>.
          </p>
          <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            HomeschoolReady, LLC &nbsp;·&nbsp; North Carolina, USA
          </p>
        </section>
      </div>
    </div>
  )
}
