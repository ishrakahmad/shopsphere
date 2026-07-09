document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getUser();
  document.getElementById('pName').value = user.name || '';
  document.getElementById('pEmail').value = user.email || '';
  document.getElementById('pPhone').value = user.phone || '';

  document.querySelectorAll('.account-nav a[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.account-nav a[data-tab]').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('profilePane').classList.toggle('hidden', link.dataset.tab !== 'profile');
      document.getElementById('addressesPane').classList.toggle('hidden', link.dataset.tab !== 'addresses');
      if (link.dataset.tab === 'addresses') loadAddresses();
    });
  });

  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    try {
      const updated = await api.patch('/users/me', {
        name: document.getElementById('pName').value.trim(),
        phone: document.getElementById('pPhone').value.trim() || undefined,
      });
      const current = getUser();
      localStorage.setItem('ss_user', JSON.stringify({ ...current, ...updated }));
      toast('Profile updated', 'success');
      renderUserMenu();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('addAddrToggle').addEventListener('click', () => {
    const wrap = document.getElementById('addAddrFormWrap');
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) wrap.innerHTML = addressFormMarkup();
    wireAddressForm();
  });
});

function addressFormMarkup(existing = {}) {
  return `
    <div class="field-row">
      <div class="field"><label>Type</label>
        <select id="afType">
          <option value="SHIPPING" ${existing.type === 'SHIPPING' ? 'selected' : ''}>Shipping</option>
          <option value="BILLING" ${existing.type === 'BILLING' ? 'selected' : ''}>Billing</option>
        </select>
      </div>
      <div class="field"><label>Full name</label><input id="afName" value="${escapeHtml(existing.fullName || '')}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Phone</label><input id="afPhone" value="${escapeHtml(existing.phone || '')}"></div>
      <div class="field"><label>Postal code</label><input id="afPostal" value="${escapeHtml(existing.postalCode || '')}"></div>
    </div>
    <div class="field"><label>Address line</label><input id="afLine" value="${escapeHtml(existing.addressLine || '')}"></div>
    <div class="field-row">
      <div class="field"><label>City</label><input id="afCity" value="${escapeHtml(existing.city || '')}"></div>
      <div class="field"><label>Country</label><input id="afCountry" value="${escapeHtml(existing.country || '')}"></div>
    </div>
    <label class="checkbox-row" style="margin-bottom:14px;"><input type="checkbox" id="afDefault" ${existing.isDefault ? 'checked' : ''}> Set as default</label>
    <div class="flex gap-8">
      <button id="saveAddrBtn" class="btn btn-primary btn-sm" data-id="${existing.id || ''}">Save address</button>
      <button id="cancelAddrBtn" class="btn btn-ghost btn-sm">Cancel</button>
    </div>
  `;
}

function wireAddressForm() {
  const cancelBtn = document.getElementById('cancelAddrBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => document.getElementById('addAddrFormWrap').classList.add('hidden'));

  const saveBtn = document.getElementById('saveAddrBtn');
  if (!saveBtn) return;
  saveBtn.addEventListener('click', async () => {
    const payload = {
      type: document.getElementById('afType').value,
      fullName: document.getElementById('afName').value.trim(),
      phone: document.getElementById('afPhone').value.trim(),
      addressLine: document.getElementById('afLine').value.trim(),
      city: document.getElementById('afCity').value.trim(),
      postalCode: document.getElementById('afPostal').value.trim(),
      country: document.getElementById('afCountry').value.trim(),
      isDefault: document.getElementById('afDefault').checked,
    };
    const id = saveBtn.dataset.id;
    try {
      if (id) await api.patch(`/addresses/${id}`, payload);
      else await api.post('/addresses', payload);
      toast('Address saved', 'success');
      document.getElementById('addAddrFormWrap').classList.add('hidden');
      loadAddresses();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function loadAddresses() {
  const wrap = document.getElementById('addressListWrap');
  try {
    const addresses = await api.get('/addresses');
    if (addresses.length === 0) {
      wrap.innerHTML = `<p class="text-sm text-soft">No saved addresses yet.</p>`;
      return;
    }
    wrap.innerHTML = addresses.map((a) => `
      <div class="address-manage-card">
        <div>
          <div style="font-weight:700; font-size:13.5px;">${escapeHtml(a.fullName)} <span class="text-faint" style="font-weight:400;">· ${a.type}${a.isDefault ? ' · default' : ''}</span></div>
          <p class="text-sm text-soft" style="margin:4px 0 0;">${escapeHtml(a.addressLine)}, ${escapeHtml(a.city)} ${escapeHtml(a.postalCode)}, ${escapeHtml(a.country)}</p>
          <p class="text-sm text-faint" style="margin:2px 0 0;">📞 ${escapeHtml(a.phone)}</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" data-edit="${a.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" data-del="${a.id}">Delete</button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      const addr = addresses.find((a) => a.id === btn.dataset.edit);
      const formWrap = document.getElementById('addAddrFormWrap');
      formWrap.classList.remove('hidden');
      formWrap.innerHTML = addressFormMarkup(addr);
      wireAddressForm();
      formWrap.scrollIntoView({ behavior: 'smooth' });
    }));

    wrap.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Delete this address?')) return;
      try {
        await api.delete(`/addresses/${btn.dataset.del}`);
        toast('Address deleted');
        loadAddresses();
      } catch (err) {
        toast(err.message, 'error');
      }
    }));
  } catch (err) {
    wrap.innerHTML = `<p class="text-sm" style="color:var(--color-danger);">${escapeHtml(err.message)}</p>`;
  }
}
