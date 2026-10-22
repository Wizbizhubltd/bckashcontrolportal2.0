import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon, UserPlusIcon } from 'lucide-react';
import { clientsApi, onboardingErrors } from '../../api/clientsApi';
import { BvnVerificationCard, ClientDetailsFields, Stepper, detailsProblem, isReady, toInput } from './OnboardingParts';
import { useOnboardingDrafts } from './useOnboardingDrafts';
import { AssignmentFields, EMPTY_ASSIGNMENT, assignmentProblem } from './AssignmentFields';

const STEPS = ['Client details', 'Verification'];

/**
 * Single-client onboarding from the control portal: as in the office portal — the client's details,
 * then their BVN verified — plus the office they join and the marketer who manages them.
 */
export function SingleOnboardingPage() {
  const navigate = useNavigate();
  const clients = useOnboardingDrafts(1);
  const draft = clients.drafts[0];
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState(EMPTY_ASSIGNMENT);

  useEffect(() => {
    if (step === 1) void clients.verifyPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const next = () => {
    setAttempted(true);
    if (detailsProblem(draft) || assignmentProblem(assignment)) return;
    setAttempted(false);
    setStep(1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await clientsApi.onboardClient({ officeId: Number(assignment.officeId), marketerId: Number(assignment.marketerId) }, toInput(draft));
      const client = result.clients[0];
      toast.success(
        client.isHighRisk
          ? `${client.displayName} onboarded and flagged high risk until marked safe.`
          : `${client.displayName} onboarded — awaiting a controller's approval.`,
      );
      navigate(`/clients/${client.id}`);
    } catch (error) {
      const errors = onboardingErrors(error);
      clients.setServerErrors(errors['members[0]'] ? { 0: errors['members[0]'] } : {});
      if (errors.office || errors.marketer) setStep(0);
      toast.error(error instanceof Error ? error.message : 'The client could not be onboarded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserPlusIcon size={20} />
        </span>
        <div>
          <h1 className="font-heading text-xl font-bold text-primary">Onboard a client</h1>
          <p className="text-sm text-gray-500">Their BVN is verified before they're added. The marketer you assign adds their documents afterwards.</p>
        </div>
      </div>

      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <AssignmentFields value={assignment} onChange={setAssignment} showProblem={attempted} />
          <ClientDetailsFields draft={draft} heading="Client details" showProblem={attempted} onChange={(changes) => clients.edit(draft.key, changes)} />
        </div>
      )}

      {step === 1 && (
        <BvnVerificationCard
          draft={draft}
          heading="BVN verification"
          onRetry={() => void clients.verify(draft)}
          onChoose={(source) => clients.choose(draft.key, source)}
          onReason={(reason) => clients.setReason(draft.key, reason)}
        />
      )}

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate('/clients') : setStep(0))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-heading font-bold text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeftIcon size={16} />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step === 0 ? (
          <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-heading font-bold text-white hover:bg-primary/90">
            Continue
            <ArrowRightIcon size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!isReady(draft) || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-heading font-bold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting && <LoaderIcon size={16} className="animate-spin" />}
            Onboard client
          </button>
        )}
      </div>
    </div>
  );
}
