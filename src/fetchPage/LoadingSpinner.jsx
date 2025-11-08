import React from 'react';
import CnbLogo from '@/cnbUtils/cnbLogo';

export const LoadingSpinner = ({ message = "加载中..." }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="flex justify-center mb-4">
      <CnbLogo
        width="32px"
        height="32px"
        colorScheme="orange"
        loadingAnimation={true}
        animationType="fade"
        loopAnimation={true}
        enableHoverRotation={false}
        enableColorToggle={false}
      />
    </div>
    <p className="text-gray-600 dark:text-gray-400">{message}</p>
  </div>
);
