import { getPFPFromPublicKey } from '@/modules/utils/image';
import { shortenAddress, showFirstAndLastFour } from '@/modules/utils/string';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactDom from 'react-dom';
import {
  useGetProfileInfoFromPubKeyLazyQuery,
  useTwitterHandleFromPubKeyLazyQuery,
  useWalletProfileLazyQuery,
} from 'src/graphql/indexerTypes';
import { useWallet } from '@solana/wallet-adapter-react';
import Modal from './Modal';
import { FollowItem } from '../views/profiles/FollowModal';
import { FollowUnfollowSource } from './FollowUnfollowButton';
import FollowAllButton, { ProfileToFollow } from './FollowAllButton';
import clsx from 'clsx';
import Popover from './Popover';

export interface AvatarIconsProps {
  profiles: {
    address: string;
    data?: AvatarIconProps['data'];
  }[];
  source?: FollowUnfollowSource;
  showFollow?: boolean;
  showFollowTitle?: string;
}

export const AvatarIcons = ({
  profiles,
  source,
  showFollow = false,
  showFollowTitle,
}: AvatarIconsProps) => {
  const wallet = useWallet();

  const [showFollowModal, setShowFollowModal] = useState(false);
  let profilesToFollow: ProfileToFollow[] = profiles.map((profile) => {
    return {
      address: profile.address,
      handle: profile.data?.twitterHandle,
      profileImageUrl: profile.data?.pfpUrl,
    };
  });
  return (
    // wrap the avatars in a container with a small, colored background
    <>
      <div
        className={`inline-flex items-center rounded-full bg-gray-600 bg-opacity-70 p-1 hover:cursor-pointer`}
        onClick={() => showFollow && profiles.length > 1 && setShowFollowModal(true)}
      >
        {profiles.slice(0, 4).map(({ address, data }, i) => (
          <div key={address} className={clsx('h-6 w-6', { '-ml-3': i > 0 })}>
            <AvatarIcon
              address={address}
              index={i}
              data={data}
              addProfileClick={!(showFollow && profiles.length > 1)}
            />
          </div>
        ))}
        {/* show how many additional creators there are when there are more than 4 */}
        {
          <div
            className={clsx(
              { hidden: profiles.length < 5 },
              '-ml-3 flex h-6 items-center rounded-full bg-gray-800 px-1 text-sm text-gray-400 hover:scale-125'
            )}
          >
            {`+${profiles.length - 4}`}
          </div>
        }
      </div>

      {source &&
        typeof window !== 'undefined' &&
        ReactDom.createPortal(
          <Modal open={showFollowModal} short setOpen={setShowFollowModal}>
            <h4 className="mt-12 h-14 text-center text-base font-medium leading-3">
              {showFollowTitle}
            </h4>
            <div className="scrollbar-thumb-rounded-full flex flex-1 flex-col space-y-6 overflow-y-auto py-4 px-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-900">
              {wallet.connected && <FollowAllButton profilesToFollow={profilesToFollow} />}
              {profiles.map((p) => (
                <FollowItem
                  key={p.address}
                  source={source}
                  user={{
                    walletAddress: p.address,
                    profileImage: p.data?.pfpUrl,
                    twitterHandle: p.data?.twitterHandle,
                  }}
                />
              ))}
            </div>
          </Modal>,
          document.getElementsByTagName('body')[0]!
        )}
    </>
  );
};

export interface AvatarIconProps {
  address: string;
  index: number;
  data?: {
    twitterHandle?: string;
    pfpUrl?: string;
  };
  addProfileClick?: boolean;
}

export const AvatarIcon = ({ address, index, data, addProfileClick = true }: AvatarIconProps) => {
  const [walletProfileQuery, walletProfileQueryContext] = useWalletProfileLazyQuery();
  const [twitterHandleQuery, twitterHandleQueryContext] = useTwitterHandleFromPubKeyLazyQuery();
  const [twitterHandle, setTwitterHandle] = useState<string | undefined>(data?.twitterHandle);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>(data?.pfpUrl);
  const leftPosPixls = 12;
  const leftPos = index * leftPosPixls;

  // query needed data if it wasnt provided
  useEffect(
    () => {
      async function queryData(walletAddress: string) {
        await twitterHandleQuery({ variables: { pubKey: walletAddress } });
        const queriedTwitterHandle = twitterHandleQueryContext.data?.wallet?.profile?.handle;
        if (queriedTwitterHandle) {
          setTwitterHandle(queriedTwitterHandle);
          walletProfileQuery({
            variables: {
              handle: queriedTwitterHandle,
            },
          });
        }
      }

      if (!data) queryData(address);
    },
    // dont include the results of the queries because this will re-trigger querying
    [walletProfileQuery, twitterHandleQuery, address, data]
  );

  useEffect(() => {
    let result: string = getPFPFromPublicKey(address);
    if (data?.pfpUrl) result = data.pfpUrl;
    else if (walletProfileQueryContext.called && !walletProfileQueryContext.loading) {
      if (walletProfileQueryContext.data?.profile?.profileImageUrlHighres) {
        result = walletProfileQueryContext.data.profile.profileImageUrlHighres;
      }
    }
    if (result) setProfilePictureUrl(result);
  }, [
    data?.pfpUrl,
    address,
    walletProfileQueryContext.called,
    walletProfileQueryContext.loading,
    walletProfileQueryContext.data?.profile?.profileImageUrlHighres,
  ]);

  return (
    <Popover
      key={address}
      isShowOnHover={true}
      placement={`bottom`}
      content={
        <p className={'m-0 text-xs font-semibold text-white'}>
          {twitterHandle || shortenAddress(address)}
        </p>
      }
    >
      {/* // Need to use style prop for dynamic style application, Tailwind does not support */}
      <div
        className="h-full w-full transition hover:z-10 hover:scale-125"
        style={{ left: leftPos }}
      >
        {addProfileClick ? (
          <Link href={`/profiles/${address}`}>
            <a>
              <img src={profilePictureUrl} alt="Profile Picture" className="rounded-full" />
            </a>
          </Link>
        ) : (
          <img src={profilePictureUrl} alt="Profile Picture" className="rounded-full" />
        )}
      </div>
    </Popover>
  );
};

export const Avatar = ({
  address,
  data,
  showAddress = true,
  border = false,
  size = 'sm',
}: {
  border?: boolean;
  address: string;
  showAddress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  data?: {
    twitterHandle?: string;
    pfpUrl?: string;
  };
}) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };
  const [getProfileInfoQuery, getProfileInfoQueryContext] = useGetProfileInfoFromPubKeyLazyQuery();
  const { publicKey } = useWallet();

  useEffect(() => {
    async function getProfileInfoAndSetState(): Promise<void> {
      await getProfileInfoQuery({ variables: { pubKey: address } });
    }

    if (!data) getProfileInfoAndSetState();
  }, [data, address, getProfileInfoQuery]);

  const twitterHandle =
    data?.twitterHandle || getProfileInfoQueryContext.data?.wallet.profile?.handle;
  const pfpUrl =
    data?.pfpUrl || getProfileInfoQueryContext.data?.wallet.profile?.profileImageUrlLowres;

  const isYou = publicKey?.toBase58() === address;
  const displayName = isYou
    ? 'You'
    : twitterHandle
    ? `@${twitterHandle}`
    : showFirstAndLastFour(address);

  return (
    <div className="flex items-center">
      <div className={`flex ${sizes[size]}`}>
        <AvatarImage src={pfpUrl ?? getPFPFromPublicKey(address)} border={border} />
      </div>

      {showAddress && (
        <div className={clsx('ml-2 text-base', isYou || twitterHandle ? 'font-sans' : 'font-mono')}>
          {displayName}
        </div>
      )}
    </div>
  );
};

export const AvatarImage = ({
  src,
  border = false,
  borderClass = 'border-2 border-gray-900 border-opacity-60',
}: {
  src: string;
  border?: boolean;
  borderClass?: string;
}) => (
  <div
    className={clsx(
      'flex',
      'overflow-clip rounded-full bg-gray-900',
      'h-full w-full',
      border && borderClass ? borderClass : undefined
    )}
  >
    <img src={src} alt="Profile Picture" className="min-h-full min-w-full object-cover" />
  </div>
);
