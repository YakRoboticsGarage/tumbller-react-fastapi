/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { RobotPayoutButton } from '../RobotPayoutButton'
import { robotManagementApi } from '../../../services/robotManagementApi'
import { mockWalletBalance, mockPayoutSuccess, mockPayoutNoFunds } from '../../../test/mocks'

// Mock the robotManagementApi
vi.mock('../../../services/robotManagementApi', () => ({
  robotManagementApi: {
    getWalletBalance: vi.fn(),
    payoutToOwner: vi.fn(),
  },
}))

const mockedApi = vi.mocked(robotManagementApi)

describe('RobotPayoutButton', () => {
  const defaultProps = {
    robotId: 'robot-123',
    robotName: 'Test Robot',
    ownerWallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedApi.getWalletBalance.mockResolvedValue(mockWalletBalance)
    mockedApi.payoutToOwner.mockResolvedValue(mockPayoutSuccess)
  })

  it('renders Collect USDC button', () => {
    render(<RobotPayoutButton {...defaultProps} />)

    expect(screen.getByRole('button', { name: /collect usdc/i })).toBeInTheDocument()
  })

  it('fetches and displays balance on mount', async () => {
    render(<RobotPayoutButton {...defaultProps} />)

    await waitFor(() => {
      expect(mockedApi.getWalletBalance).toHaveBeenCalledWith('robot-123')
    })

    // Should display both USDC and ETH balances
    expect(await screen.findByText('$10.50 USDC')).toBeInTheDocument()
    expect(await screen.findByText('0.001 ETH')).toBeInTheDocument()
  })

  it('shows loading spinner while fetching balance', () => {
    // Make the API call hang
    mockedApi.getWalletBalance.mockImplementation(
      () => new Promise(() => {})
    )

    render(<RobotPayoutButton {...defaultProps} />)

    // Should show spinner (aria-label from Chakra Spinner)
    expect(document.querySelector('.chakra-spinner')).toBeInTheDocument()
  })

  it('opens modal when clicking Collect USDC button', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    expect(screen.getByText('Collect USDC Earnings')).toBeInTheDocument()
    expect(screen.getByText(/Transfer USDC earnings from/)).toBeInTheDocument()
  })

  it('displays owner wallet in modal', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    // Owner wallet is truncated using slice(0, 10)...slice(-8) format
    // 0xabcdefab...cdefabcd
    expect(screen.getByText('0xabcdefab...cdefabcd')).toBeInTheDocument()
  })

  it('calls payoutToOwner when clicking Transfer USDC', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    const modal = screen.getByRole('dialog')
    const transferButton = within(modal).getByRole('button', { name: /transfer usdc/i })
    await user.click(transferButton)

    await waitFor(() => {
      expect(mockedApi.payoutToOwner).toHaveBeenCalledWith('robot-123')
    })
  })

  it('shows success message after successful payout', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: /transfer usdc/i }))

    await waitFor(() => {
      expect(screen.getByText('USDC transfer complete!')).toBeInTheDocument()
    })

    // Should show transaction hash link
    expect(screen.getByText('View on BaseScan')).toBeInTheDocument()
  })

  it('shows warning when no funds available', async () => {
    mockedApi.payoutToOwner.mockResolvedValue(mockPayoutNoFunds)

    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: /transfer usdc/i }))

    await waitFor(() => {
      expect(screen.getByText('No USDC available in robot wallet.')).toBeInTheDocument()
    })
  })

  it('disables Transfer button after successful payout', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: /transfer usdc/i }))

    await waitFor(() => {
      expect(screen.getByText('USDC transfer complete!')).toBeInTheDocument()
    })

    const transferButton = within(modal).getByRole('button', { name: /transfer usdc/i })
    expect(transferButton).toBeDisabled()
  })

  it('refreshes balance when clicking refresh button', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    // Wait for initial load
    await waitFor(() => {
      expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1)
    })

    // Click refresh button
    const refreshButton = await screen.findByLabelText('Refresh balance')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(2)
    })
  })

  it('closes modal when clicking modal Close button', async () => {
    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))
    expect(screen.getByText('Collect USDC Earnings')).toBeInTheDocument()

    // Find the Close button in the footer (not the X button in header)
    // The footer Close button is inside a footer element
    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    // The last one should be in the footer
    const footerCloseButton = closeButtons.find(btn => btn.textContent === 'Close')
    if (!footerCloseButton) throw new Error('Footer close button not found')
    await user.click(footerCloseButton)

    await waitFor(() => {
      expect(screen.queryByText('Collect USDC Earnings')).not.toBeInTheDocument()
    })
  })

  it('shows loading state during payout', async () => {
    // Make payout hang
    mockedApi.payoutToOwner.mockImplementation(
      () => new Promise(() => {})
    )

    const user = userEvent.setup()
    render(<RobotPayoutButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /collect usdc/i }))

    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: /transfer usdc/i }))

    expect(screen.getByText('Transferring USDC...')).toBeInTheDocument()
  })
})
