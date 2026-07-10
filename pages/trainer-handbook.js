import { useState } from 'react'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { Loader2, ShieldAlert } from 'lucide-react'
import LoginScreen from '../components/auth/LoginScreen'
import { useRefreshedUser } from '../lib/UserRefreshContext'
import { canAccessTrainerHandbook } from '../lib/auth'
import TrainerHandbook, { TraineeIntakeModal } from '../components/training/TrainerHandbook'
import { PageSkeleton } from '../components/SkeletonLoader'

export default function TrainerHandbookPage() {
  const { data: session, status } = useSession()
  const { session: refreshedSession, hasRefreshed } = useRefreshedUser()
  const effectiveSession = refreshedSession || session

  const [trainee, setTrainee] = useState(null)

  if (status === 'loading' || (status === 'authenticated' && !hasRefreshed)) {
    return <PageSkeleton variant="form" />
  }

  if (status !== 'authenticated') {
    return <LoginScreen />
  }

  if (!canAccessTrainerHandbook(effectiveSession)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gsrp-sunset/10 border border-gsrp-sunset/25 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-gsrp-sunset" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Trainers only</h1>
          <p className="text-sm text-gsrp-teal-light/50 leading-relaxed">
            The trainer handbook is only available to staff trainers. If you believe you should have access,
            contact a High Rank.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head><title>Trainer Handbook — GSRP</title></Head>
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Trainer Handbook</h1>
          <p className="text-sm text-gsrp-teal-light/50 mt-1">Your guided 1:1 ride-along report and marking sheet.</p>
        </div>

        {trainee ? (
          <TrainerHandbook trainee={trainee} />
        ) : (
          <TraineeIntakeModal onConfirm={setTrainee} />
        )}
      </div>
    </>
  )
}
