import { Dispatch, FC, SetStateAction, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useOutsideAlerter } from '@/hooks/useOutsideAlerter';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { getPFPFromPublicKey } from '@/modules/utils/image';
import Link from 'next/link';
import { showFirstAndLastFour } from '@/modules/utils/string';
import { FollowUnfollowButton, FollowUnfollowSource } from '@/components/FollowUnfollowButton';
import {
  ConnectionNodeFragment,
  useAllConnectionsFromQuery,
  useAllConnectionsToQuery,
} from 'src/graphql/indexerTypes';
import { useProfileData } from 'src/views/profiles/ProfileDataProvider';
import { useConnectedWalletProfile } from 'src/views/_global/ConnectedWalletProfileProvider';
import { Close } from '@/assets/icons/Close';
export type FollowModalVisibility = 'hidden' | 'followers' | 'following';

type FollowModalProps = {
  wallet?: AnchorWallet;
  visibility: FollowModalVisibility;
  setVisibility:
    | Dispatch<SetStateAction<FollowModalVisibility>>
    | ((visibility: FollowModalVisibility) => void);
};

export const FollowModal: FC<FollowModalProps> = ({ wallet, visibility, setVisibility }) => {
  const { publicKey, followers, following } = useProfileData();

  const modalRef = useRef<HTMLDivElement>(null!);
  useOutsideAlerter(modalRef, () => setVisibility('hidden'));

  return (
    <div
      role="dialog"
      className={clsx(
        'fixed top-0 left-0 right-0 bottom-0 z-20',
        'bg-gray-800 bg-opacity-40 backdrop-blur-lg ',
        'transition-opacity duration-500 ease-in-out',
        'flex flex-col items-center justify-center',
        {
          'opacity-100': visibility !== 'hidden',
          'opacity-0': visibility === 'hidden',
          'pointer-events-auto': visibility !== 'hidden',
          'pointer-events-none': visibility === 'hidden',
        }
      )}
    >
      <div
        ref={modalRef}
        className="relative flex h-full max-h-screen w-full flex-col rounded-xl bg-gray-900 pt-6  text-white shadow-md sm:max-h-[30rem] sm:max-w-lg"
      >
        <button onClick={() => setVisibility('hidden')} className="absolute top-6 right-6">
          <Close color="#fff" />
        </button>
        <div id="tabs" className="mt-4 flex h-14">
          <button
            onClick={() => setVisibility('followers')}
            className={clsx(
              'flex flex-1 items-center justify-center border-b-2 text-base font-medium leading-3',
              {
                'border-b-white text-white': visibility === 'followers',
                'border-gray-800 text-gray-400': visibility !== 'followers',
              }
            )}
          >
            Followers
          </button>
          <button
            onClick={() => setVisibility('following')}
            className={clsx(
              'flex flex-1 items-center justify-center border-b-2 text-base font-medium leading-3',
              {
                'border-b-white text-white': visibility === 'following',
                'border-gray-800 text-gray-400': visibility !== 'following',
              }
            )}
          >
            Following
          </button>
        </div>
        <div className="scrollbar-thumb-rounded-full flex flex-1 flex-col space-y-6 overflow-y-auto py-4 px-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-900">
          {visibility === 'followers'
            ? followers?.map((profile) => (
                <FollowItem
                  key={profile.address as string}
                  source={'modalFollowers'}
                  user={{
                    walletAddress: profile.address,
                    profileImage:
                      profile.profile?.profileImageUrlLowres ||
                      profile.profile?.profileImageUrlLowres,
                    twitterHandle: profile.profile?.handle,
                  }}
                />
              ))
            : null}
          {visibility === 'following'
            ? following?.map((profile) => (
                <FollowItem
                  key={profile.address as string}
                  source={'modalFollowing'}
                  user={{
                    walletAddress: profile.address,
                    profileImage:
                      profile.profile?.profileImageUrlLowres ||
                      profile.profile?.profileImageUrlLowres,
                    twitterHandle: profile.profile?.handle,
                  }}
                />
              ))
            : null}
        </div>
      </div>
    </div>
  );
};

export interface FollowUserProfile {
  walletAddress: string;
  twitterHandle?: string;
  profileImage?: string;
}

type FollowItemProps = {
  user: FollowUserProfile;
  source: FollowUnfollowSource;
};

export const FollowItem: FC<FollowItemProps> = ({ user, source }) => {
  const { connectedProfile } = useConnectedWalletProfile();
  const myPubkey = connectedProfile?.pubkey;

  const copyUserPubKey = async () => {
    if (user.walletAddress) {
      await navigator.clipboard.writeText(user.walletAddress);
    }
  };

  const userIsMe = user.walletAddress === myPubkey ?? false;
  const userHasTwitter = !!user.twitterHandle;
  const amIFollowingThisAccount = connectedProfile?.following?.some(
    (p) => p.address === user.walletAddress
  );

  return (
    <div className="flex h-10">
      <div className="flex flex-1 justify-between">
        <div className="flex items-center">
          <img
            onClick={copyUserPubKey}
            className="rounded-full"
            width={40}
            height={40}
            src={user.profileImage ?? getPFPFromPublicKey(user.walletAddress)}
            alt="PFP"
          />
          <Link href={`/profiles/${user.walletAddress}`} passHref>
            <a
              className={clsx('ml-3 text-base font-medium leading-6 text-white', {
                'font-sans': userHasTwitter,
                'font-mono': !userHasTwitter,
              })}
            >
              {userHasTwitter ? `@${user.twitterHandle}` : showFirstAndLastFour(user.walletAddress)}
            </a>
          </Link>
        </div>
        <div className="flex items-center">
          {userIsMe || !myPubkey || !connectedProfile.walletConnectionPair ? null : (
            <FollowUnfollowButton
              walletConnectionPair={connectedProfile.walletConnectionPair}
              source={source}
              type={amIFollowingThisAccount ? 'Unfollow' : 'Follow'}
              toProfile={{
                address: user.walletAddress,
                handle: user.twitterHandle,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
