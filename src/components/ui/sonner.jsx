import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { useEffect, useState } from "react"

// 自定义toast组件，带有进度条边框
const ProgressToast = ({ id, duration = 4000, status = 'default', children, action, cancel }) => {
  const isInfinite = duration === Infinity

  // 根据状态获取颜色类名
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500/30 border-green-500/30'
      case 'error':
        return 'bg-red-500/30 border-red-500/30'
      case 'warning':
        return 'bg-yellow-500/30 border-yellow-500/30'
      case 'info':
        return 'bg-blue-500/30 border-blue-500/30'
      case 'loading':
        return 'bg-gray-500/30 border-gray-500/30'
      default:
        return 'bg-primary/30 border-primary/30'
    }
  }

  const statusColor = getStatusColor()

  return (
    <div className="relative p-1">
      {/* 进度条边框 */}
      <div className="absolute inset-0 overflow-hidden rounded-md">
        <div className={`absolute inset-0 border-2 rounded-md progress-border-container ${statusColor}`}>
          <div
            className={`absolute inset-0 rounded-md ${
              isInfinite ? 'progress-border-infinite' : 'progress-border'
            } ${statusColor.replace('border-', 'bg-')}`}
            style={{
              '--progress-duration': `${duration}ms`
            }}
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="relative bg-background rounded-md p-4">
        {children}
        {(action || cancel) && (
          <div className="flex gap-2 mt-3 justify-end">
            {cancel && (
              <button
                onClick={cancel.onClick}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                {cancel.label}
              </button>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .progress-border-container {
          clip-path: inset(0 0 0 0 round 6px);
        }

        .progress-border {
          clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
          transform-origin: center;
          animation: progress-swipe var(--progress-duration) linear forwards;
        }

        .progress-border-infinite {
          clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
          transform-origin: center;
          animation: progress-rotate 1s linear infinite;
        }

        @keyframes progress-swipe {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes progress-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

// 扩展toast函数以支持进度条样式
const customToast = (message, options = {}) => {
  const { duration = 4000, status = 'default', action, cancel, ...restOptions } = options

  return sonnerToast.custom((t) => (
    <ProgressToast
      id={t}
      duration={duration}
      status={status}
      action={action}
      cancel={cancel}
    >
      {typeof message === 'function' ? message(t) : message}
    </ProgressToast>
  ), {
    duration: duration,
    ...restOptions
  })
}

// 为自定义toast添加success、error等方法
const toastWithMethods = Object.assign(customToast, {
  success: (message, options) => customToast(message, { ...options, status: 'success' }),
  error: (message, options) => customToast(message, { ...options, status: 'error' }),
  warning: (message, options) => customToast(message, { ...options, status: 'warning' }),
  info: (message, options) => customToast(message, { ...options, status: 'info' }),
  loading: (message, options) => customToast(message, { ...options, status: 'loading', duration: Infinity }),
  custom: customToast,
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise
})

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-transparent group-[.toaster]:shadow-lg p-0",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />)
  );
}

export { Toaster, toastWithMethods as toast }

