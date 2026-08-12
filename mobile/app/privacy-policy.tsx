import { LegalDocument } from '@/components/LegalDocument';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="August 2026"
      intro="This Privacy Policy explains what information TRU Performance ('the App', 'we', 'us') collects from coaches and athletes who use it, how that information is used, and the choices you have. By creating an account you agree to the collection and use of information as described here."
      sections={[
        {
          heading: '1. Information we collect',
          body:
            'Account information: your name, email address, and password (your password is never stored in readable form). ' +
            'Athlete profile information entered by you or your coach: primary event, event group, group/classification, baseline mark, and qualifying standard. ' +
            'Training data you log: weekly performance results, rate of perceived exertion (RPE), sleep, soreness, and energy scores, free-text notes, and strength test results (squat, bench, clean, deadlift). ' +
            'Device information: a push-notification token used to deliver alerts to your device, if you allow notifications. ' +
            'Subscription information: your plan tier and subscription status, managed through Apple App Store or Google Play — we do not receive or store your payment card details.',
        },
        {
          heading: '2. How we use your information',
          body:
            'To provide the core features of the App: showing your squad, tracking performance and training load over time, projecting future performance, generating qualifying-standard alerts, and building your workout plans. ' +
            'To send notifications you have opted into, such as personal-best alerts, missing-log reminders, and qualifying-risk warnings. ' +
            'To operate the AI coaching assistant: when a coach asks the assistant a question, a summary of their squad\'s performance data is sent to our AI provider to generate a response (see Section 4). ' +
            'To process and manage subscriptions.',
        },
        {
          heading: '3. Coaches and athlete data',
          body:
            'Coaches can create athlete accounts directly, or athletes can join a programme themselves using a join code shared by their coach. Either way, a coach can see the training data of every athlete in their programme — that visibility is core to how the App works. Athletes can see only their own data. If you are a coach adding an athlete under the age of 13, you are responsible for ensuring you have appropriate parental or guardian permission before doing so.',
        },
        {
          heading: '4. Third parties we share data with',
          body:
            'We use a small number of service providers to run the App, and share only what each one needs to do its job: ' +
            'Supabase, our backend and database provider, stores all account and training data. ' +
            'Anthropic processes squad performance summaries to power the AI coaching assistant feature, only when you use that feature. ' +
            'RevenueCat, together with Apple App Store and Google Play, manages subscription billing. ' +
            'Expo\'s push notification service delivers alerts to your device. ' +
            'We do not sell your personal information, and we do not use advertising or analytics trackers.',
        },
        {
          heading: '5. Data security',
          body:
            'Data is encrypted in transit between your device and our servers. Database access controls ensure a coach can only see data belonging to their own programme, and an athlete can only see their own data. No method of transmission or storage is 100% secure, but we take reasonable steps to protect your information.',
        },
        {
          heading: '6. Your choices and rights',
          body:
            'You can review and edit your profile information at any time from within the App. You can permanently delete your account and all associated data at any time from Settings — this immediately and permanently removes your profile, logged results, and workout history, and cannot be undone. You can disable notifications at any time from your device settings.',
        },
        {
          heading: '7. Data retention',
          body:
            'We retain your information for as long as your account is active, or as needed to provide the App\'s features. If you delete your account, your data is removed immediately, except where we are required to retain limited records (such as billing history) for legal or accounting purposes.',
        },
        {
          heading: '8. Children\'s privacy',
          body:
            'TRU Performance is intended for coaches and athletes participating in organized training programmes, which commonly include athletes under 18. Athletes who create their own account (using a coach\'s join code) must be 13 years of age or older. For athletes under 13, an account may only be created by their coach — by doing so, the coach confirms they have the athlete\'s parent or guardian\'s permission to enter that athlete\'s information. We do not knowingly allow children under 13 to create their own account.',
        },
        {
          heading: '9. Changes to this policy',
          body:
            'We may update this Privacy Policy from time to time. If we make material changes, we will notify you within the App. Continued use of the App after a change means you accept the updated policy.',
        },
        {
          heading: '10. Contact us',
          body: 'Questions about this policy or your data can be sent to admin@nexgenoptimize.com.',
        },
      ]}
    />
  );
}
