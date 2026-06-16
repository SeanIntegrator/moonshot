import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { checkSlugAvailable } from '../../lib/admin-api.js';
import {
  getOrderAheadBaseUrl,
  slugifyCafeName,
  validateSlugClient,
} from '../../lib/onboarding-utils.js';

const TIMEZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: '#2a2a2e' },
    '&:hover fieldset': { borderColor: '#71717a' },
    '&.Mui-focused fieldset': { borderColor: '#e8ff47' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e8ff47' },
  '& .MuiInputBase-input': { color: '#f4f4f5' },
  '& .MuiInputLabel-root': { color: '#71717a' },
};

type Props = {
  cafeName: string;
  cafeSlug: string;
  timezone: string;
  slugTouched: boolean;
  onCafeNameChange: (v: string) => void;
  onCafeSlugChange: (v: string) => void;
  onSlugTouched: () => void;
  onTimezoneChange: (v: string) => void;
  onContinue: () => void;
};

export function SignupStepCafe({
  cafeName,
  cafeSlug,
  timezone,
  slugTouched,
  onCafeNameChange,
  onCafeSlugChange,
  onSlugTouched,
  onTimezoneChange,
  onContinue,
}: Props) {
  const headingId = useId();
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'check_failed'
  >('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slugError = validateSlugClient(cafeSlug);
  const orderBase = getOrderAheadBaseUrl();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!cafeSlug.trim()) {
      setSlugStatus('idle');
      return;
    }
    if (slugError) {
      setSlugStatus('invalid');
      return;
    }
    setSlugStatus('checking');
    debounceRef.current = setTimeout(() => {
      void checkSlugAvailable(cafeSlug)
        .then((r) => setSlugStatus(r.available ? 'available' : 'taken'))
        .catch(() => setSlugStatus('check_failed'));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cafeSlug, slugError]);

  function handleNameChange(v: string) {
    onCafeNameChange(v);
    if (!slugTouched) {
      onCafeSlugChange(slugifyCafeName(v));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onContinue();
  }

  const canContinue =
    cafeName.trim().length >= 2 && !slugError && slugStatus === 'available';

  return (
    <Box component="form" onSubmit={onSubmit} aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Your café
      </Typography>
      <TextField
        fullWidth
        label="Café name"
        placeholder="Clay & Bean"
        value={cafeName}
        onChange={(e) => handleNameChange(e.target.value)}
        margin="normal"
        required
        autoFocus
        sx={fieldSx}
      />
      <TextField
        fullWidth
        label="URL slug"
        value={cafeSlug}
        onChange={(e) => {
          onSlugTouched();
          onCafeSlugChange(e.target.value.toLowerCase());
        }}
        margin="normal"
        required
        helperText={
          slugStatus === 'checking' ? (
            'Checking availability…'
          ) : slugStatus === 'available' ? (
            <Box component="span" sx={{ color: '#2d6a4f' }}>
              Available
            </Box>
          ) : slugStatus === 'taken' ? (
            <Box component="span" sx={{ color: '#ff4d4d' }}>
              Taken — try another
            </Box>
          ) : slugStatus === 'check_failed' ? (
            <Box component="span" sx={{ color: '#ff4d4d' }}>
              Could not check availability — ensure the API is running and DATABASE_URL is correct
            </Box>
          ) : slugError ? (
            slugError
          ) : (
            'Lowercase letters, numbers, and hyphens'
          )
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Typography variant="caption" sx={{ color: '#71717a', fontFamily: 'monospace' }}>
                {orderBase.replace(/^https?:\/\//, '')}/
              </Typography>
            </InputAdornment>
          ),
          endAdornment:
            slugStatus === 'checking' ? (
              <InputAdornment position="end">
                <CircularProgress size={18} sx={{ color: '#71717a' }} />
              </InputAdornment>
            ) : undefined,
        }}
        sx={fieldSx}
        inputProps={{ 'aria-live': 'polite' }}
      />
      <FormControl fullWidth margin="normal" sx={fieldSx}>
        <InputLabel id="tz-label">Timezone</InputLabel>
        <Select
          labelId="tz-label"
          value={timezone}
          label="Timezone"
          onChange={(e) => onTimezoneChange(e.target.value)}
        >
          {TIMEZONES.map((tz) => (
            <MenuItem key={tz} value={tz}>
              {tz}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={!canContinue}
        sx={{
          mt: 3,
          bgcolor: '#e8ff47',
          color: '#0a0a0b',
          fontWeight: 700,
          '&:hover': { bgcolor: '#d4eb3a' },
          '&.Mui-disabled': { bgcolor: '#2a2a2e', color: '#71717a' },
        }}
      >
        Continue
      </Button>
    </Box>
  );
}
