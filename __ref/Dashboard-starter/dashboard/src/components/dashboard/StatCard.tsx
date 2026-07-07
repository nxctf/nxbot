import { Card, Skeleton, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import styles from './statCard.module.css';
import React, { Fragment } from 'react';

const { Text } = Typography;

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  number: number;
  loading: boolean;
  link?: string;
  isCard?: boolean;
}

const StatCard = ({
  icon,
  title,
  number,
  link,
  loading = false,
  isCard = true,
}: StatCardProps) => {
  const navigate = useNavigate();

  const children = (
    <div style={{ cursor: link ? 'pointer' : 'default' }}>
      <span className={`${styles.iconWrapper} text-primary text-opacity-80`}>
        {icon}
      </span>
      <div className={styles.statContent}>
        <div className={styles.statTitle}>
          <Text
            style={{ width: '100%', color: 'grey' }}
            ellipsis={{ tooltip: title || '' }}
          >
            {title || ''}
          </Text>
        </div>
        <div className={styles.statNumber}>
          {loading ? (
            <Skeleton.Input
              active
              size="small"
              style={{ width: 80, marginTop: 8 }}
            />
          ) : (
            <CountUp
              start={0}
              end={number}
              duration={4}
              useEasing
              useGrouping
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Fragment>
      {isCard ? (
        <Card
          onClick={() => {
            if (link) {
              navigate(link);
            }
          }}
          size="default"
          variant="borderless"
          style={{ padding: '18px 0' }}
        >
          {children}
        </Card>
      ) : (
        children
      )}
    </Fragment>
  );
};

export default StatCard;
