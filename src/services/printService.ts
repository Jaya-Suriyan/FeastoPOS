import RNPrint from 'react-native-print';

export interface PrintConfig {
  fileName?: string;
}

// Date range selection with proper date picker
const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function formatOrderToHTML(order: any): string {
  const orderNumber = order?.orderNumber || order?.id || 'N/A';
  const createdAt = order?.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : 'N/A';
  const orderType = order?.orderType || order?.deliveryMethod || 'collection';
  const customerName = order?.user?.firstName
    ? `${order.user.firstName} ${order.user.lastName || ''}`.trim()
    : order?.customer?.name || 'Customer';
  const customerEmail = order?.user?.email || order?.customer?.email || '';
  const customerPhone = order?.user?.phone || order?.customer?.phone || '';
  const branchName = order?.branchId?.name || 'Restaurant';

  // Format items
  const items = Array.isArray(order?.products)
    ? order.products.map((p: any) => ({
        name: p.product?.name || p.name,
        qty: p.quantity ?? p.qty ?? 1,
        price: Number(p.itemTotal ?? p.price?.total ?? p.price ?? 0),
        notes: p.notes || '',
        attributes: Array.isArray(p.selectedAttributes)
          ? p.selectedAttributes.map((a: any) => ({
              attributeName: a.attributeName,
              selectedItems: (a.selectedItems || []).map((si: any) => ({
                itemName: si.itemName,
                itemPrice: si.itemPrice,
                quantity: si.quantity,
              })),
            }))
          : [],
      }))
    : Array.isArray(order?.items)
    ? order.items.map((it: any) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        notes: it.notes || '',
        attributes: it.attributes || [],
      }))
    : [];

  // Calculate totals
  const subtotal = Number(order?.subtotal ?? order?.totalAmount ?? 0);
  const serviceCharge = Number(
    order?.serviceCharge ?? order?.serviceCharges?.totalAll ?? 0,
  );
  const tips = Number(order?.tips ?? 0);
  const deliveryFee = Number(order?.deliveryFee ?? 0);
  const discount = Number(
    order?.discountApplied?.discountAmount ??
      order?.discount?.discountAmount ??
      0,
  );
  const total = Number(order?.finalTotal ?? order?.total ?? 0);

  const paymentMethod =
    order?.paymentMethod || order?.payment?.method || 'card';
  const paymentStatus =
    order?.paymentStatus || order?.payment?.status || 'paid';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>POS Receipt - ${orderNumber}</title>
    <style>
      body {
        font-family: monospace, 'Courier New', Courier;
        max-width: 300px;
        margin: 0 auto;
        background: #fff;
        color: #000;
        font-size: 12px;
      }
      .bill-container {
        border-top: 3px dashed #444;
        border-bottom: 3px dashed #444;
        padding: 16px 12px 20px 12px;
        margin-top: 24px;
        margin-bottom: 24px;
      }
      .header {
        text-align: center;
        font-weight: bold;
        font-size: 1.2em;
        margin-bottom: 10px;
      }
      .order-no {
        font-size: 1.1em;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .order-type {
        font-weight: bold;
        margin-bottom: 5px;
        text-transform: capitalize;
      }
      .order-time {
        margin-bottom: 10px;
        font-size: 0.9em;
      }
      .divider {
        margin: 8px 0;
        border-top: 1px dashed #888;
      }
      .items {
        margin-bottom: 10px;
      }
      .item-row {
        margin-bottom: 5px;
      }
      .item-name {
        font-weight: bold;
      }
      .item-attributes {
        margin-left: 10px;
        font-size: 0.9em;
        color: #666;
      }
      .item-notes {
        margin-left: 10px;
        font-style: italic;
        color: #666;
        font-size: 0.9em;
      }
      .summary {
        width: 100%;
        margin-bottom: 10px;
      }
      .summary td {
        border: none;
        padding: 2px 0;
        font-size: 0.95em;
      }
      .total-row {
        border-top: 1px solid #222;
        border-bottom: 1px solid #222;
        font-weight: bold;
        font-size: 1.1em;
      }
      .payment-status {
        text-align: center;
        margin: 15px 0 10px 0;
        font-size: 1.1em;
        border-top: 2px solid #222;
        border-bottom: 2px solid #222;
        padding: 5px 0;
      }
      .customer {
        margin-bottom: 10px;
        font-size: 0.9em;
      }
      .customer-info {
        margin-bottom: 3px;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 0.9em;
        color: #666;
      }
      .customer-notes {
        margin-top: 10px;
        padding: 8px;
        background-color: #f5f5f5;
        border-left: 3px solid #ccc;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="bill-container">
      <div class="header">${branchName.toUpperCase()}</div>
      
      <div class="order-no">Order: ${orderNumber}</div>
      
      <div class="order-type">${orderType}</div>
      
      <div class="order-time">
        <div><b>Placed:</b> ${createdAt}</div>
        ${
          order?.estimatedTimeToComplete
            ? `<div><b>ETA:</b> ${order.estimatedTimeToComplete} minutes</div>`
            : ''
        }
      </div>
      
      <div class="divider"></div>
      
      <div class="items">
        ${items
          .map(
            (item: {
              qty: any;
              name: any;
              price: number;
              attributes: { attributeName: any; selectedItems: any[] }[];
              notes: any;
            }) => `
          <div class="item-row">
            <div class="item-name">${item.qty} × ${
              item.name
            } £${item.price.toFixed(2)}</div>
            ${item.attributes
              .map(
                (attr: { attributeName: any; selectedItems: any[] }) => `
              <div class="item-attributes">
                ${attr.attributeName}: ${attr.selectedItems
                  .map((si: { itemName: any }) => si.itemName)
                  .join(', ')}
              </div>
            `,
              )
              .join('')}
            ${
              item.notes
                ? `<div class="item-notes">Note: ${item.notes}</div>`
                : ''
            }
          </div>
        `,
          )
          .join('')}
      </div>
      
      <div class="divider"></div>
      
      <table class="summary">
        <tr>
          <td>Subtotal:</td>
          <td style="text-align:right;">£${subtotal.toFixed(2)}</td>
        </tr>
        ${
          discount > 0
            ? `
        <tr>
          <td>Discount:</td>
          <td style="text-align:right;">-£${discount.toFixed(2)}</td>
        </tr>
        `
            : ''
        }
        ${
          serviceCharge > 0
            ? `
        <tr>
          <td>Service Charge:</td>
          <td style="text-align:right;">£${serviceCharge.toFixed(2)}</td>
        </tr>
        `
            : ''
        }
        ${
          tips > 0
            ? `
        <tr>
          <td>Tips:</td>
          <td style="text-align:right;">£${tips.toFixed(2)}</td>
        </tr>
        `
            : ''
        }
        ${
          deliveryFee > 0 && orderType === 'delivery'
            ? `
        <tr>
          <td>Delivery Fee:</td>
          <td style="text-align:right;">£${deliveryFee.toFixed(2)}</td>
        </tr>
        `
            : ''
        }
        <tr class="total-row">
          <td><b>TOTAL:</b></td>
          <td style="text-align:right;"><b>£${total.toFixed(2)}</b></td>
        </tr>
      </table>
      
      <div class="payment-status">
        ${paymentStatus.toUpperCase()} – ${paymentMethod.toUpperCase()}
      </div>
      
      <div class="customer">
        <div class="customer-info"><b>Customer:</b> ${customerName}</div>
        ${
          customerEmail
            ? `<div class="customer-info"><b>Email:</b> ${customerEmail}</div>`
            : ''
        }
        ${
          customerPhone
            ? `<div class="customer-info"><b>Phone:</b> ${customerPhone}</div>`
            : ''
        }
      </div>
      
      ${
        order?.customerNotes
          ? `
        <div class="customer-notes">
          <b>Customer Notes:</b><br>
          ${order.customerNotes}
        </div>
      `
          : ''
      }
      
      <div class="footer">
        Thank you for your order!
      </div>
    </div>
  </body>
</html>`;
}

export async function printOrder(
  order: any,
  config?: PrintConfig,
): Promise<void> {
  try {
    const htmlContent = formatOrderToHTML(order);

    await RNPrint.print({
      html: htmlContent,
    });
  } catch (error) {
    console.log('Print error:', error);
    throw new Error(`Failed to print: ${error}`);
  }
}

export interface PrintOptions {
  includeOrderNumber: boolean;
  includeCustomer: boolean;
  includeType: boolean;
  includeAmount: boolean;
  includeTime: boolean;
  includeStatus: boolean;
}

export async function printOrders(
  orders: any[],
  dateRange: { fromDate: Date; toDate: Date },
  printOptions?: PrintOptions,
): Promise<void> {
  if (!orders || orders.length === 0) {
    console.log('No orders to print');
    return;
  }
  console.log('Printing orders', orders);

  try {
    // Default print options if not provided
    const options = printOptions || {
      includeOrderNumber: true,
      includeCustomer: true,
      includeType: true,
      includeAmount: true,
      includeTime: false,
      includeStatus: false,
    };

    // Calculate summary statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum: number, order: any) => sum + order.total,
      0,
    );
    const deliveryOrders = orders.filter(o => o.type === 'delivery').length;
    const collectionOrders = orders.filter(o => o.type === 'collection').length;

    // Group by status
    const statusGroups = orders.reduce(
      (acc: Record<string, number>, order: any) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Generate simple POS printer content
    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Order Report</title>
    <style>
      body {
        font-family: monospace;
        font-size: 11px;
        max-width: 300px;
        margin: 0;
        padding: 8px;
        line-height: 1.1;
      }
      .center { text-align: center; }
      .divider { border-top: 1px dashed #000; margin: 5px 0; }
      .summary { margin: 8px 0; }
      .orders-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 5px;
        font-size: 10px;
      }
      .orders-table td {
        padding: 1px 2px;
        border: none;
        vertical-align: top;
      }
      .col-no { width: 8%; text-align: center; }
      .col-id { width: 20%; font-size: 7px; }
      .col-customer { width: 35%; }
      .col-type { width: 8%; text-align: center; }
      .col-time { width: 15%; text-align: center; font-size: 8px; }
      .col-status { width: 12%; text-align: center; font-size: 8px; }
      .col-price { width: 29%; text-align: right; }
    </style>
  </head>
  <body>
    <div class="center">
      <strong>ORDER REPORT</strong><br>
      ${formatDate(dateRange.fromDate)} - ${formatDate(dateRange.toDate)}
    </div>
    
    <div class="divider"></div>
    
    <div class="summary">
      <strong>SUMMARY</strong><br>
      Total Orders: ${totalOrders}<br>
      Total Revenue: £${totalRevenue.toFixed(2)}<br>
      Delivery: ${deliveryOrders}<br>
      Collection: ${collectionOrders}
    </div>
    
    <div class="divider"></div>
    
    <div>
      <strong>ORDERS</strong><br>
      <table class="orders-table">
        <tr>
          <td class="col-no"><strong>#</strong></td>
          ${
            options.includeOrderNumber
              ? '<td class="col-id"><strong>ID</strong></td>'
              : ''
          }
          ${
            options.includeCustomer
              ? '<td class="col-customer"><strong>CUSTOMER</strong></td>'
              : ''
          }
          ${
            options.includeType
              ? '<td class="col-type"><strong>T</strong></td>'
              : ''
          }
          ${
            options.includeTime
              ? '<td class="col-time"><strong>TIME</strong></td>'
              : ''
          }
          ${
            options.includeStatus
              ? '<td class="col-status"><strong>STATUS</strong></td>'
              : ''
          }
          ${
            options.includeAmount
              ? '<td class="col-price"><strong>AMOUNT</strong></td>'
              : ''
          }
        </tr>
        ${orders
          .map(
            (order, index) => `
        <tr>
          <td class="col-no">${index + 1}</td>
          ${
            options.includeOrderNumber
              ? `<td class="col-id">${order.orderNumber}</td>`
              : ''
          }
          ${
            options.includeCustomer
              ? `<td class="col-customer">${
                  order.customer.length > 15
                    ? order.customer.substring(0, 15) + '...'
                    : order.customer
                }</td>`
              : ''
          }
          ${
            options.includeType
              ? `<td class="col-type">${order.type
                  .charAt(0)
                  .toUpperCase()}</td>`
              : ''
          }
          ${
            options.includeTime
              ? `<td class="col-time">${new Date(
                  order.createdAt,
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}</td>`
              : ''
          }
          ${
            options.includeStatus
              ? `<td class="col-status">${order.status}</td>`
              : ''
          }
          ${
            options.includeAmount
              ? `<td class="col-price">£${order.total.toFixed(2)}</td>`
              : ''
          }
        </tr>
      `,
          )
          .join('')}
      </table>
    </div>
    
    <div class="divider"></div>
    <div class="center">
      ${new Date().toLocaleString()}
    </div>
  </body>
</html>`;

    await RNPrint.print({
      html: htmlContent,
    });

    console.log(`Successfully printed ${totalOrders} orders`);
  } catch (error) {
    console.error('Print error:', error);
    throw new Error(`Failed to print orders: ${error}`);
  }
}
