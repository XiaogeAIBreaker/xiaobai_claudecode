/**
 * T032: 二维码显示组件
 * 用于显示微信群、QQ群等联系方式的二维码
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  Divider
} from '@mui/material';
import {
  QrCode2,
  ContactSupport,
  Groups,
  ContentCopy
} from '@mui/icons-material';

/**
 * 二维码类型
 */
export enum QRCodeType {
  WECHAT_SUPPORT = 'wechat-support',
  WECHAT_COMMUNITY = 'wechat-community',
  QQ_GROUP = 'qq-group'
}

/**
 * 二维码信息接口
 */
interface QRCodeInfo {
  type: QRCodeType;
  title: string;
  description: string;
  imagePath: string;
  fallbackText?: string;
  contactInfo?: string;
}

/**
 * 组件属性接口
 */
interface QRCodeViewProps {
  /** 二维码类型 */
  type: QRCodeType;
  /** 显示标题 */
  title?: string;
  /** 显示描述 */
  description?: string;
  /** 是否显示备用联系方式 */
  showFallback?: boolean;
  /** 自定义样式 */
  sx?: any;
}

/**
 * 二维码信息配置
 */
const QR_CODE_CONFIG: Record<QRCodeType, QRCodeInfo> = {
  [QRCodeType.WECHAT_SUPPORT]: {
    type: QRCodeType.WECHAT_SUPPORT,
    title: '微信技术支持群',
    description: '遇到技术问题？扫码加入我们的技术支持群获取专业帮助',
    imagePath: 'assets/qr-codes/wechat-support.png',
    fallbackText: '微信号：claude-support-cn',
    contactInfo: 'claude-support-cn'
  },
  [QRCodeType.WECHAT_COMMUNITY]: {
    type: QRCodeType.WECHAT_COMMUNITY,
    title: '微信用户社区',
    description: '加入用户社区，与其他开发者交流经验，分享最佳实践',
    imagePath: 'assets/qr-codes/wechat-community.png',
    fallbackText: '微信号：claude-community-cn',
    contactInfo: 'claude-community-cn'
  },
  [QRCodeType.QQ_GROUP]: {
    type: QRCodeType.QQ_GROUP,
    title: 'QQ用户群',
    description: '备用联系方式，QQ用户群同样提供技术支持和社区交流',
    imagePath: 'assets/qr-codes/qq-group.png',
    fallbackText: 'QQ群号：123456789',
    contactInfo: '123456789'
  }
};

/**
 * 二维码显示组件
 */
const QRCodeView: React.FC<QRCodeViewProps> = ({
  type,
  title,
  description,
  showFallback = true,
  sx = {}
}) => {
  const config = QR_CODE_CONFIG[type];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  /**
   * 复制联系信息到剪贴板
   */
  const copyToClipboard = async () => {
    if (config.contactInfo) {
      try {
        await navigator.clipboard.writeText(config.contactInfo);
        // 这里可以添加一个简单的提示
        console.log('联系信息已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  /**
   * 获取图标
   */
  const getIcon = () => {
    switch (type) {
      case QRCodeType.WECHAT_SUPPORT:
        return <ContactSupport color="primary" />;
      case QRCodeType.WECHAT_COMMUNITY:
        return <Groups color="primary" />;
      case QRCodeType.QQ_GROUP:
        return <QrCode2 color="primary" />;
      default:
        return <QrCode2 color="primary" />;
    }
  };

  /**
   * 处理图片加载错误
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    // 隐藏图片，显示备用文本
    event.currentTarget.style.display = 'none';
  };

  return (
    <Card sx={{ maxWidth: 400, margin: 'auto', ...sx }}>
      <CardContent>
        {/* 标题和图标 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {getIcon()}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {displayTitle}
          </Typography>
        </Box>

        {/* 描述 */}
        <Typography variant="body2" color="text.secondary" paragraph>
          {displayDescription}
        </Typography>

        {/* 二维码图片 */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <img
            src={config.imagePath}
            alt={displayTitle}
            style={{
              maxWidth: '200px',
              maxHeight: '200px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px'
            }}
            onError={handleImageError}
          />
        </Box>

        {/* 扫码提示 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            请使用微信或QQ扫描上方二维码加入群聊
          </Typography>
        </Alert>

        {/* 备用联系方式 */}
        {showFallback && config.fallbackText && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                扫码遇到问题？请手动添加：
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {config.fallbackText}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={copyToClipboard}
                >
                  复制
                </Button>
              </Box>
            </Box>
          </>
        )}

        {/* 使用提示 */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            💡 提示：群内有专业的技术支持团队，遇到任何问题都可以获得及时帮助
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * 预定义的二维码组件
 */
export const WeChatSupportQR: React.FC<Omit<QRCodeViewProps, 'type'>> = (props) => (
  <QRCodeView type={QRCodeType.WECHAT_SUPPORT} {...props} />
);

export const WeChatCommunityQR: React.FC<Omit<QRCodeViewProps, 'type'>> = (props) => (
  <QRCodeView type={QRCodeType.WECHAT_COMMUNITY} {...props} />
);

export const QQGroupQR: React.FC<Omit<QRCodeViewProps, 'type'>> = (props) => (
  <QRCodeView type={QRCodeType.QQ_GROUP} {...props} />
);

export default QRCodeView;