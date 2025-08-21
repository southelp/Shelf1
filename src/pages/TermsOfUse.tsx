// src/pages/TermsOfUse.tsx

export default function TermsOfUse() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-gray-800">
      <h1 className="text-3xl font-bold text-center mb-8">Terms of Use</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to Taejea Open Shelf ("we," "our," or "us"). By accessing or using our service, you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Service Description</h2>
          <p>
            Taejea Open Shelf is a platform that allows users to catalog their personal books and facilitate lending and borrowing among members of a community. We are not a party to any loan agreement between users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. User Responsibilities</h2>
          <p className="mb-2">
            As a user, you agree to:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Provide accurate and current information about yourself and the books you list.</li>
            <li>Respect other users and communicate in a civil manner.</li>
            <li>Take good care of any books you borrow and return them on time.</li>
            <li>Not use the service for any illegal or unauthorized purpose.</li>
            <li>Be solely responsible for your interactions with other users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Content Ownership</h2>
          <p>
            You retain ownership of the information and content you submit to the service (e.g., book lists). However, by submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display that content in connection with the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Disclaimers and Limitation of Liability</h2>
          <p className="mb-2">
            The service is provided "as is" without any warranties. We do not guarantee the accuracy of book information, the condition of books, or the conduct of our users.
          </p>
          <p>
            We are not liable for any damages or losses related to your use of the service, including but not limited to lost or damaged books, or negative interactions between users. The responsibility for arranging and managing loans lies entirely with the participating users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Termination</h2>
          <p>
            We may terminate or suspend your access to our service at any time, without prior notice or liability, for any reason, including if you breach these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the service after any such changes constitutes your acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us. (Contact information to be added).
          </p>
        </section>
      </div>
      
      <p className="text-center text-sm text-gray-500 mt-10">
        Last updated: August 21, 2025
      </p>
    </div>
  );
}
