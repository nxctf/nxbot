import { useState, Fragment } from 'react';

export interface LazyImageProps {
  placeholder: React.ReactNode;
  src: string;
  alt?: string;
  className?: string;
}

const LazyImageContent = ({
  placeholder,
  src,
  alt = '',
  className,
}: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <Fragment>{placeholder}</Fragment>;
  }

  return (
    <Fragment>
      {!loaded && placeholder}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ display: loaded ? undefined : 'none' }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </Fragment>
  );
};

const LazyImage = (props: LazyImageProps) => (
  <LazyImageContent key={props.src} {...props} />
);

export default LazyImage;
