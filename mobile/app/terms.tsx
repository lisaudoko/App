import { LegalDocument } from '@/components/LegalDocument';

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated="August 2026"
      intro="These Terms of Service ('Terms') govern your use of TRU Performance (the 'App'). By creating an account or using the App, you agree to these Terms. If you do not agree, do not use the App."
      sections={[
        {
          heading: '1. Accounts and eligibility',
          body:
            'You must provide accurate information when creating an account. You are responsible for keeping your login credentials secure and for all activity under your account. Athletes creating their own account must be 13 years of age or older. Athletes under 13 may only be added by their coach, who by doing so confirms they have obtained permission from that athlete\'s parent or guardian. Coaches are responsible for the accounts of any athlete they create directly.',
        },
        {
          heading: '2. Subscriptions and billing',
          body:
            'Coach accounts include a 30-day free trial. After the trial, continued access requires an active paid subscription, billed through the Apple App Store or Google Play depending on your device. Subscriptions automatically renew for the same period unless cancelled at least 24 hours before the end of the current period. You can manage or cancel your subscription at any time in your Apple ID or Google Play account settings. Charges are handled entirely by Apple or Google — refunds are subject to their respective policies, not ours.',
        },
        {
          heading: '3. Acceptable use',
          body:
            'You agree not to: use the App for any unlawful purpose; attempt to access another coach\'s programme or another athlete\'s data without authorization; interfere with or disrupt the App\'s infrastructure; or reverse-engineer, resell, or redistribute the App.',
        },
        {
          heading: '4. Training and health information',
          body:
            'TRU Performance is a training-tracking and coaching-support tool. It is not a medical device and does not provide medical advice, diagnosis, or treatment. Performance projections, workout weight calculations, and AI-generated suggestions are estimates based on the data entered and should be reviewed by a qualified coach before being applied. Consult a medical professional before beginning or changing a training programme, particularly for athletes with injuries or health conditions.',
        },
        {
          heading: '5. AI coaching assistant',
          body:
            'The AI assistant generates responses using a third-party AI model based on the squad data available to the requesting coach at the time. Responses may be incomplete or inaccurate and should be treated as a starting point for the coach\'s own judgment, not as a final coaching decision.',
        },
        {
          heading: '6. Your content',
          body:
            'You retain ownership of the training data, notes, and other content you submit. By submitting content, you grant us the right to store and process it solely to operate and improve the App. We do not claim ownership of your data, and you can delete it at any time as described in our Privacy Policy.',
        },
        {
          heading: '7. Termination',
          body:
            'You may stop using the App and delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms. Coaches who cancel their subscription retain access until the end of their current billing period; after that, access to coach features is paused until a subscription is reactivated.',
        },
        {
          heading: '8. Disclaimer of warranties',
          body:
            'The App is provided "as is" without warranties of any kind, express or implied. We do not guarantee the App will be uninterrupted, error-free, or that performance projections or AI-generated content will be accurate.',
        },
        {
          heading: '9. Limitation of liability',
          body:
            'To the fullest extent permitted by law, TRU Performance and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the App, including any training or coaching decisions made based on information in the App.',
        },
        {
          heading: '10. Changes to these Terms',
          body:
            'We may update these Terms from time to time. If we make material changes, we will notify you within the App. Continued use of the App after a change means you accept the updated Terms.',
        },
        {
          heading: '11. Contact us',
          body: 'Questions about these Terms can be sent to admin@nexgenoptimize.com.',
        },
      ]}
    />
  );
}
