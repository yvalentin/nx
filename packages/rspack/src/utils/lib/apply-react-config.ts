import { Configuration, RspackOptionsNormalized } from '@rspack/core';
import { SvgrOptions } from '../with-react';

export function applyReactConfig(
  options: { svgr?: boolean | SvgrOptions },
  config: Partial<RspackOptionsNormalized | Configuration> = {}
): void {
  if (global.NX_GRAPH_CREATION) return;

  addHotReload(config);

  if (options.svgr !== false || typeof options.svgr === 'object') {
    removeSvgLoaderIfPresent(config);

    const defaultSvgrOptions = {
      svgo: false,
      titleProp: true,
      ref: true,
    };

    const svgrOptions =
      typeof options.svgr === 'object' ? options.svgr : defaultSvgrOptions;

    config.module.rules.push(
      {
        test: /\.svg$/i,
        type: 'asset',
        resourceQuery: /react/, // *.svg?react
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        resourceQuery: { not: [/react/] }, // exclude react component if *.svg?react
        use: [{ loader: '@svgr/webpack', options: svgrOptions }],
      }
    );
  }

  // enable rspack node api
  config.node = {
    __dirname: true,
    __filename: true,
  };
}

function removeSvgLoaderIfPresent(
  config: Partial<RspackOptionsNormalized | Configuration>
) {
  const svgLoaderIdx = config.module.rules.findIndex(
    (rule) => typeof rule === 'object' && rule.test.toString().includes('svg')
  );
  if (svgLoaderIdx === -1) return;
  config.module.rules.splice(svgLoaderIdx, 1);
}

function addHotReload(
  config: Partial<RspackOptionsNormalized | Configuration>
) {
  const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');
  const isDev =
    process.env.NODE_ENV === 'development' || config.mode === 'development';

  if (isDev && config['devServer']?.hot) {
    // check if we are using babel and add the plugin
    const babelLoader = config.module.rules.find(
      (rule) =>
        rule &&
        typeof rule !== 'string' &&
        rule.loader?.toString().includes('babel-loader')
    );

    if (babelLoader && typeof babelLoader !== 'string') {
      babelLoader.options['plugins'] = [
        ...(babelLoader.options['plugins'] || []),
        [
          require.resolve('react-refresh/babel'),
          {
            skipEnvCheck: true,
          },
        ],
      ];
    }
  }
  if (isDev) {
    config.plugins.push(new ReactRefreshPlugin({ overlay: false }));
  }
}
