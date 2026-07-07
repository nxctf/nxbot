import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { webRoutes } from '../../routes/web';
import { Dropdown } from 'antd';
import { ProLayout, ProLayoutProps } from '@ant-design/pro-components';
import Icon, { DownloadOutlined, LogoutOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/adminSlice';
import { memo } from 'react';
import { sidebar } from './sidebar';
import { apiRoutes } from '../../routes/api';
import http from '../../utils/http';
import {
  handleErrorResponse,
  NotificationType,
  showNotification,
} from '../../utils';
import { RiShieldUserFill } from 'react-icons/ri';
import usePwaInstall from '../hooks/pwaInstall';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { canInstall, isInstalled, install } = usePwaInstall();

  const defaultProps: ProLayoutProps = {
    title: CONFIG.appName,
    logo: '/icon.png',
    fixedHeader: true,
    fixSiderbar: true,
    layout: CONFIG.theme.sidebarLayout,
    route: {
      routes: sidebar,
    },
  };

  const logoutAdmin = () => {
    dispatch(logout());
    navigate(webRoutes.login, {
      replace: true,
    });

    http.post(apiRoutes.logout).catch((error) => {
      handleErrorResponse(error);
    });
  };

  const handleDownload = async () => {
    if (isInstalled) {
      showNotification(
        'App is already installed on this device',
        NotificationType.SUCCESS,
      );
      return;
    }

    if (canInstall) {
      const accepted = await install();

      if (accepted) {
        showNotification(
          'App installed successfully',
          NotificationType.SUCCESS,
        );
      }

      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIos) {
      showNotification(
        'Tap Share, then choose Add to Home Screen',
        NotificationType.SUCCESS,
        'Install on iOS',
      );
      return;
    }

    showNotification(
      'Use the install icon in your browser address bar, or open the browser menu and choose Install app.',
      NotificationType.SUCCESS,
      'Install app',
    );
  };

  const avatarMenuItems = [
    ...(CONFIG.enablePWA
      ? [
          {
            key: 'download',
            icon: <DownloadOutlined />,
            label: isInstalled ? 'Installed' : 'Download',
            disabled: isInstalled,
            onClick: () => {
              void handleDownload();
            },
          },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logoutAdmin();
      },
    },
  ];

  return (
    <div className="h-screen">
      <ProLayout
        {...defaultProps}
        token={{
          sider: {
            colorMenuBackground: 'white',
          },
        }}
        location={location}
        onMenuHeaderClick={() => navigate(webRoutes.dashboard)}
        menuItemRender={(item, dom) => (
          <a
            onClick={(e) => {
              e.preventDefault();
              if (item.path) {
                navigate(item.path);
              }
            }}
            href={item.path}
          >
            {dom}
          </a>
        )}
        avatarProps={{
          icon: <Icon component={RiShieldUserFill} />,
          className: 'bg-primary bg-opacity-20 text-primary text-opacity-90',
          size: 'small',
          shape: 'square',
          title: 'Admin',
          render: (_, dom) => {
            return (
              <Dropdown
                menu={{
                  items: avatarMenuItems,
                }}
              >
                {dom}
              </Dropdown>
            );
          },
        }}
      >
        <Outlet />
      </ProLayout>
    </div>
  );
};

export default memo(Layout);
