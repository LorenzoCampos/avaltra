import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/axios';
import type {
  ImportExcelTemplateCommitRequest,
  ImportExcelTemplateCommitResponse,
  ImportExcelTemplatePreviewRequest,
  ImportExcelTemplatePreviewResponse,
} from '@/types/importExcelTemplate';

const IMPORT_PREVIEW_ENDPOINT = '/imports/excel-template/preview';
const IMPORT_COMMIT_ENDPOINT = '/imports/excel-template/commit';

const getImportExcelTemplateErrorMessage = (error: unknown, fallback: string) => {
  return (
    (error as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.error ??
    (error as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.details ??
    fallback
  );
};

export const buildImportExcelTemplatePreviewFormData = (
  request: Pick<ImportExcelTemplatePreviewRequest, 'file' | 'currency'>,
) => {
  const formData = new FormData();
  formData.append('file', request.file);
  formData.append('currency', request.currency);
  return formData;
};

export const buildImportExcelTemplateCommitFormData = (
  request: Pick<ImportExcelTemplateCommitRequest, 'file' | 'currency' | 'decisions'>,
) => {
  const formData = buildImportExcelTemplatePreviewFormData(request);
  formData.append('decisions', JSON.stringify(request.decisions));
  return formData;
};

export const useImportExcelTemplatePreview = () => {
  return useMutation({
    mutationFn: async (request: ImportExcelTemplatePreviewRequest) => {
      const response = await api.post<ImportExcelTemplatePreviewResponse>(
        IMPORT_PREVIEW_ENDPOINT,
        buildImportExcelTemplatePreviewFormData(request),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Account-ID': request.accountId,
          },
        },
      );

      return response.data;
    },
    onError: (error) => {
      toast.error('Preview failed', {
        description: getImportExcelTemplateErrorMessage(error, 'Could not parse the workbook preview.'),
      });
    },
  });
};

export const useImportExcelTemplateCommit = () => {
  return useMutation({
    mutationFn: async (request: ImportExcelTemplateCommitRequest) => {
      const response = await api.post<ImportExcelTemplateCommitResponse>(
        IMPORT_COMMIT_ENDPOINT,
        buildImportExcelTemplateCommitFormData(request),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Account-ID': request.accountId,
          },
        },
      );

      return response.data;
    },
    onSuccess: () => {
      toast.success('Import completed');
    },
    onError: (error) => {
      toast.error('Import failed', {
        description: getImportExcelTemplateErrorMessage(error, 'Could not commit the workbook import.'),
      });
    },
  });
};
